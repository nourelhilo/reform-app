const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DATABASE_NAME || 'ai_fitness_coach';

  if (!uri) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  MongoDB Warning: MONGODB_URI is not set in environment variables.');
    console.warn('\x1b[33m%s\x1b[0m', '   Please provide a valid connection string in backend/.env or root .env.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      dbName: dbName,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('\x1b[32m%s\x1b[0m', `✓ MongoDB Connected: ${conn.connection.host}/${dbName}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error('\x1b[31m%s\x1b[0m', `❌ MongoDB Connection Failed: ${error.message}`);
    return false;
  }
};

const getDBStatus = () => ({
  connected: isConnected && mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
});

module.exports = { connectDB, getDBStatus };
