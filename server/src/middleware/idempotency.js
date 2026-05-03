import IdempotencyKey from '../models/IdempotencyKey.js';

/**
 * Idempotency middleware — prevents duplicate mutations.
 * Client sends `Idempotency-Key` header on POST/PUT/DELETE.
 * If the same key+userId pair already has a recorded response, return it
 * immediately without executing the handler again.
 */
export default async function idempotency(req, res, next) {
  // Only guard mutation methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const key = req.headers['idempotency-key'];
  if (!key) {
    // No key provided — pass through (backwards compat)
    return next();
  }

  const userId = req.user?._id?.toString() || 'anonymous';

  try {
    // Check for existing response
    const existing = await IdempotencyKey.findOne({ key, userId });
    if (existing && existing.statusCode) {
      // Return the cached response
      return res.status(existing.statusCode).json(existing.responseBody);
    }

    // Reserve the key (without response yet) to prevent race conditions
    if (!existing) {
      try {
        await IdempotencyKey.create({
          key,
          userId,
          method: req.method,
          path: req.originalUrl,
        });
      } catch (err) {
        // Duplicate key error (11000) — another request is in-flight with the same key
        if (err.code === 11000) {
          return res.status(409).json({ message: 'Duplicate request in progress' });
        }
        throw err;
      }
    }

    // Intercept res.json to capture the response
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Fire-and-forget: persist the response for future idempotent lookups
      IdempotencyKey.updateOne(
        { key, userId },
        { statusCode: res.statusCode, responseBody: body }
      ).catch(() => {}); // swallow errors — non-critical
      return originalJson(body);
    };

    next();
  } catch (err) {
    // If idempotency check fails, don't block the request — just log and proceed
    console.error('Idempotency middleware error:', err.message);
    next();
  }
}
