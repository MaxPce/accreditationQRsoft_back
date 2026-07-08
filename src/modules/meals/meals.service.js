// src/modules/meals/meals.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");
const accreditations = require("../accreditations/accreditations.service");

async function getTodayStatus({ idcompany, idevent, idacreditation }) {
  const [rows] = await pool.query(
    `SELECT meal_type, scanned_at FROM meal_records
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ? AND meal_date = CURDATE()`,
    [idcompany, idevent, idacreditation]
  );
  const taken = {};
  rows.forEach((r) => (taken[r.meal_type] = r.scanned_at));
  return taken;
}

async function checkMeal({ idcompany, idevent, idacreditation, mealType, idaccount }) {
  const validTypes = ["desayuno", "almuerzo", "cena"];
  if (!validTypes.includes(mealType)) {
    throw new AppError(400, "Tipo de comida inválido");
  }

  const [existing] = await pool.query(
    `SELECT id, scanned_at FROM meal_records
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ?
       AND meal_type = ? AND meal_date = CURDATE()`,
    [idcompany, idevent, idacreditation, mealType]
  );

  if (existing.length) {
    throw new AppError(
      409,
      `Ya se registró ${mealType} el día de hoy a las ${new Date(existing[0].scanned_at).toLocaleTimeString()}`
    );
  }

  await pool.query(
    `INSERT INTO meal_records (idcompany, idevent, idacreditation, meal_type, meal_date, idaccount)
     VALUES (?, ?, ?, ?, CURDATE(), ?)`,
    [idcompany, idevent, idacreditation, mealType, idaccount]
  );

  return { mealType, scannedAt: new Date() };
}

module.exports = { getTodayStatus, checkMeal };