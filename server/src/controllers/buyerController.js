import Buyer from '../models/Buyer.js';

export const getBuyers = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (active !== undefined) filter.isActive = active === 'true';

    const buyers = await Buyer.find(filter).sort({ name: 1 });
    res.json(buyers);
  } catch (error) {
    next(error);
  }
};

export const getBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findById(req.params.id);
    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
    res.json(buyer);
  } catch (error) {
    next(error);
  }
};

export const createBuyer = async (req, res, next) => {
  try {
    const { openingBalance } = req.body;
    if (openingBalance) {
      req.body.currentBalance = openingBalance;
    }
    const buyer = await Buyer.create(req.body);
    res.status(201).json(buyer);
  } catch (error) {
    next(error);
  }
};

export const updateBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
    res.json(buyer);
  } catch (error) {
    next(error);
  }
};

export const deleteBuyer = async (req, res, next) => {
  try {
    const buyer = await Buyer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { returnDocument: 'after' }
    );
    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
    res.json({ message: 'Buyer deactivated' });
  } catch (error) {
    next(error);
  }
};
