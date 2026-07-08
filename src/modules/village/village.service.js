// src/modules/village/village.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

const VALID_GATES = ["puerta1", "puerta2"];

async function getEntriesToday({ idcompany, idevent, idacreditation }) {
  const [rows] = await pool.query(
    `SELECT gate, scanned_at FROM village_entries
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ?
       AND DATE(scanned_at) = CURDATE()
     ORDER BY scanned_at DESC`,
    [idcompany, idevent, idacreditation]
  );
  return rows;
}

async function registerEntry({ idcompany, idevent, idacreditation, gate, idaccount }) {
  if (!VALID_GATES.includes(gate)) {
    throw new AppError(400, "Puerta inválida, use puerta1 o puerta2");
  }

  await pool.query(
    `INSERT INTO village_entries (idcompany, idevent, idacreditation, gate, idaccount)
     VALUES (?, ?, ?, ?, ?)`,
    [idcompany, idevent, idacreditation, gate, idaccount]
  );

  return { gate, scannedAt: new Date() };
}

module.exports = { getEntriesToday, registerEntry };