// src/middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const jwtConfig = require("../config/jwt");

const STAGE_LEVELS = {
  company_logged: 1,
  event_selected: 2,
};

function requireAuth(minStage) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError(401, "Token no proporcionado");

    const token = authHeader.replace("Bearer ", "");

    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.secret);
    } catch {
      throw new AppError(401, "Token inválido o expirado");
    }

    const currentLevel = STAGE_LEVELS[payload.stage] || 0;
    const requiredLevel = STAGE_LEVELS[minStage] || 0;

    if (currentLevel < requiredLevel) {
      throw new AppError(403, "Debes completar el paso previo (seleccionar evento)");
    }

    req.user = payload;
    next();
  };
}

module.exports = { requireAuth };