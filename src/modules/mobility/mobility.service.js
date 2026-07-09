// src/modules/mobility/mobility.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

const VALID_LOCATIONS = ["videna", "villa_panamericana"];
const VALID_EVENT_TYPES = ["salida", "llegada"];

function nowPeru() {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "America/Lima" })
    .replace("T", " ");
}

async function getLogsToday({ idcompany, idevent, idacreditation }) {
  const [rows] = await pool.query(
    `SELECT location, event_type, scanned_at
     FROM mobility_logs
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ?
       AND DATE(scanned_at) = CURDATE()
     ORDER BY scanned_at DESC`,
    [idcompany, idevent, idacreditation]
  );
  return rows;
}

async function registerLog({ idcompany, idevent, idacreditation, location, event_type, idaccount }) {
  if (!VALID_LOCATIONS.includes(location)) {
    throw new AppError(400, "Escenario inválido. Use: videna o villa_panamericana");
  }
  if (!VALID_EVENT_TYPES.includes(event_type)) {
    throw new AppError(400, "Tipo de evento inválido. Use: salida o llegada");
  }

  // Validar permiso P5 - Transporte (opcional, si quieres verificarlo)
  // puedes consultarlo de accreditation vs master_details donde iddetails='P5'

  const scannedAt = nowPeru();

  await pool.query(
    `INSERT INTO mobility_logs (idcompany, idevent, idacreditation, location, event_type, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idcompany, idevent, idacreditation, location, event_type, scannedAt, idaccount]
  );

  return { location, event_type, scannedAt };
}

module.exports = { getLogsToday, registerLog };