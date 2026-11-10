const errorHandler = (err, req, res, next) => {
  console.error('\x1b[31m%s\x1b[0m', `[API Error] ${req.method} ${req.originalUrl}:`, err);

  const invalidId = err.code === '22P02';
  const statusCode = invalidId ? 400 : err.status || 500;
  const message = invalidId ? 'Invalid workout ID.' :
    statusCode < 500 || statusCode === 503 ? err.message : 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
