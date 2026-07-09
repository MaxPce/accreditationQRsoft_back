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

async function getHistory({ idcompany, idevent, docnumber, location, date, limit = 100 }) {
  const conditions = ["ml.idcompany = ?", "ml.idevent = ?"];
  const params     = [idcompany, idevent];

  if (docnumber) { conditions.push("p.docnumber LIKE ?");   params.push(`%${docnumber}%`); }
  if (location)  { conditions.push("ml.location = ?");      params.push(location); }
  if (date)      { conditions.push("DATE(ml.scanned_at) = ?"); params.push(date); }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT
       ml.idacreditation, ml.location, ml.event_type, ml.scanned_at,
       p.firstname, p.lastname, p.surname,
       p.docnumber, p.doctype,
       docm.name_es AS doctype_name,
       rolm.name_es AS role_name,
       a.tregister
     FROM mobility_logs ml
     INNER JOIN accreditation a
       ON a.idcompany = ml.idcompany AND a.idevent = ml.idevent
      AND a.idacreditation = ml.idacreditation
     INNER JOIN person p
       ON p.idcompany = a.idcompany AND p.idperson = a.idperson
     LEFT JOIN master_details docm
       ON docm.idcompany = a.idcompany AND docm.idmaster = 4 AND docm.iddetails = p.doctype
     LEFT JOIN master_details rolm
       ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
     WHERE ${conditions.join(" AND ")}
     ORDER BY ml.scanned_at DESC
     LIMIT ?`,
    params
  );

  return rows.map((r) => ({
    idacreditation: r.idacreditation,
    location:       r.location,
    event_type:     r.event_type,
    scanned_at:     r.scanned_at,
    person: {
      fullname:    [r.firstname, r.lastname, r.surname].filter(Boolean).join(" "),
      docnumber:   r.docnumber,
      doctypeName: r.doctype_name,
    },
    role: { code: r.tregister, name: r.role_name || r.tregister },
  }));
}

module.exports = { getLogsToday, registerLog, getHistory };