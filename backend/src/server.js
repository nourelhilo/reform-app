const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/db');
const { initFirebase } = require('./config/firebase');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════');
  console.log('\x1b[36m%s\x1b[0m', '  AI FITNESS COACH - BACKEND API SERVER');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════');

  // Initialize external services
  await connectDB();
  initFirebase();

  const server = app.listen(PORT, () => {
    console.log('\x1b[32m%s\x1b[0m', `✓ Server listening on http://localhost:${PORT}`);
    console.log('\x1b[90m%s\x1b[0m', `  Health Check: http://localhost:${PORT}/api/health`);
  });

  const handleShutdown = () => {
    console.log('\nGracefully shutting down backend server...');
    server.close(() => {
      console.log('Server terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
};

startServer();
