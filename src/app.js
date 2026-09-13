import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import { assertAllowedOrigin } from './config/origins.js';
import { verifyRequestOrigin } from './middlewares/originMiddleware.js';

const app = express();

const corsOptions = {
  origin(origin, callback) {
    try {
      assertAllowedOrigin(origin);
      return callback(null, true);
    } catch (error) {
      return callback(error);
    }
  },
  credentials: true
};

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

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
      users: 'GET /api/auth/users?page=1&limit=20&search=... (admin)'
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

app.use('/api/auth', verifyRequestOrigin, authRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
