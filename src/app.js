import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import AppError from './utils/AppError.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new AppError('Origin không được phép truy cập API', 403, 'Forbidden'));
  }
};

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Chào mừng đến với JWT Auth API',
    healthCheck: '/health',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      changePassword: 'PUT /api/auth/change-password',
      logout: 'POST /api/auth/logout',
      users: 'GET /api/auth/users (admin)'
    },
    statusCode: 200
  });
});

app.get('/health', (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === 1;
  const statusCode = isDatabaseConnected ? 200 : 503;

  res.status(statusCode).json({
    message: isDatabaseConnected ? 'API is ready' : 'Database is not connected',
    status: isDatabaseConnected ? 'healthy' : 'unhealthy',
    database: isDatabaseConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    statusCode
  });
});

app.use('/api/auth', authRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
