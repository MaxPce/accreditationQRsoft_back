// src/middlewares/error.middleware.js
module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(err);
  res.status(statusCode).json({
    ok: false,
    message: err.message || "Error interno del servidor",
  });
};