// src/modules/village/village.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

const VALID_GATES = ["puerta1", "puerta2"];

function nowPeru() {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");
}

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

  const scannedAt = nowPeru(); 

  await pool.query(
    `INSERT INTO village_entries (idcompany, idevent, idacreditation, gate, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [idcompany, idevent, idacreditation, gate, scannedAt, idaccount]
  );

  return { gate, scannedAt };
}

module.exports = { getEntriesToday, registerEntry };