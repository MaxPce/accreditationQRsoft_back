// src/modules/meals/meals.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

function nowPeru() {
  // Retorna string "YYYY-MM-DD HH:MM:SS" en hora Perú
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");
}

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
      `Ya se registró ${mealType} el día de hoy a las ${new Date(existing[0].scanned_at).toLocaleTimeString("es-PE", { timeZone: "America/Lima" })}`
    );
  }

  const scannedAt = nowPeru(); // 👈 "2026-07-09 13:20:05"

  await pool.query(
    `INSERT INTO meal_records (idcompany, idevent, idacreditation, meal_type, meal_date, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
    [idcompany, idevent, idacreditation, mealType, scannedAt, idaccount]
  );

  return { mealType, scannedAt };
}

module.exports = { getTodayStatus, checkMeal };