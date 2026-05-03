import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import errorHandler from './middleware/errorHandler.js';
import idempotency from './middleware/idempotency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route imports
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import vendorRoutes from './routes/vendors.js';
import buyerRoutes from './routes/buyers.js';
import godownRoutes from './routes/godowns.js';
import truckRoutes from './routes/trucks.js';
import purchaseRoutes from './routes/purchases.js';
import saleRoutes from './routes/sales.js';
import challanRoutes from './routes/challans.js';
import paymentRoutes from './routes/payments.js';
import ledgerRoutes from './routes/ledger.js';
import inventoryRoutes from './routes/inventory.js';
import dashboardRoutes from './routes/dashboard.js';
import expenseCategoryRoutes from './routes/expenseCategories.js';
import expenseRoutes from './routes/expenses.js';
import accountBalanceRoutes from './routes/accountBalances.js';
import userRoutes from './routes/users.js';
import auditLogRoutes from './routes/auditLogs.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting (only in production)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth', limiter);
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Idempotency guard — deduplicates mutations when Idempotency-Key header is present
app.use(idempotency);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/godowns', godownRoutes);
app.use('/api/trucks', truckRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/account-balances', accountBalanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
