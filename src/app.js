const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Chào mừng đến với JWT Auth API',
    documentation: '/health',
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
  res.status(200).json({ message: 'API is running', statusCode: 200 });
});

app.use('/api/auth', authRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
