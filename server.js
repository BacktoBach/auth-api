require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { validateEnv } = require('./src/config/env');
const app = require('./src/app');

const HOST = '0.0.0.0';
let server;
let isShuttingDown = false;

const startServer = async () => {
  const config = validateEnv();
  await connectDB(config.mongoUri);

  server = app.listen(config.port, HOST, () => {
    console.log(`Server is running at http://localhost:${config.port}`);
    console.log(`Health check: http://localhost:${config.port}/health`);
  });
};

const closeHttpServer = () => new Promise((resolve, reject) => {
  if (!server) return resolve();
  return server.close((error) => (error ? reject(error) : resolve()));
});

const shutdown = async (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await closeHttpServer();
    await mongoose.disconnect();
    clearTimeout(forceExitTimer);
    console.log('HTTP server and MongoDB connection closed');
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch(async (error) => {
  console.error('Failed to start server:', error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error('Failed to close MongoDB connection:', disconnectError.message);
  }
  process.exit(1);
});
