// src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const { jwt: jwtConfig } = require("../config/env");

function requireAuth(requiredStage) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return next(new AppError(401, "Token requerido"));
    }
    try {
      const payload = jwt.verify(header.split(" ")[1], jwtConfig.secret);
      if (requiredStage && payload.stage !== requiredStage) {
        return next(
          new AppError(403, "Debes completar el paso previo (seleccionar evento)")
        );
      }
      req.user = payload;
      next();
    } catch (e) {
      return next(new AppError(401, "Token inválido o expirado"));
    }
  };
}

module.exports = { requireAuth };