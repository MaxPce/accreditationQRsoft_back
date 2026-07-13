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
       AND deleted_at IS NULL
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

  const scannedAt = nowPeru();

  await pool.query(
    `INSERT INTO mobility_logs (idcompany, idevent, idacreditation, location, event_type, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idcompany, idevent, idacreditation, location, event_type, scannedAt, idaccount]
  );

  return { location, event_type, scannedAt };
}

async function getHistory({ idcompany, idevent, docnumber, location, date, limit = 100 }) {
  const conditions = ["ml.idcompany = ?", "ml.idevent = ?", "ml.deleted_at IS NULL"];
  const params     = [idcompany, idevent];

  if (docnumber) { conditions.push("p.docnumber LIKE ?");      params.push(`%${docnumber}%`); }
  if (location)  { conditions.push("ml.location = ?");         params.push(location); }
  if (date)      { conditions.push("DATE(ml.scanned_at) = ?"); params.push(date); }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT
       ml.id, ml.idacreditation, ml.location, ml.event_type, ml.scanned_at,
       p.firstname, p.lastname, p.surname,
       p.docnumber, p.doctype,
       docm.name_es AS doctype_name,
       rolm.name_es AS role_name,
       a.tregister,
       ph.ruta AS photo_ruta
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
     LEFT JOIN (
       SELECT idcompany, idperson, ruta,
              ROW_NUMBER() OVER (
                PARTITION BY idcompany, idperson
                ORDER BY updated_at DESC, idphoto DESC
              ) AS rn
       FROM photos
       WHERE mstatus = 1
     ) ph ON ph.idcompany = a.idcompany AND ph.idperson = p.idperson AND ph.rn = 1
     WHERE ${conditions.join(" AND ")}
     ORDER BY ml.scanned_at DESC
     LIMIT ?`,
    params
  );

  const PHOTOS_BASE_URL = process.env.PHOTOS_BASE_URL || "https://master.hayllis.com/writable/uploads/";

  return rows.map((r) => ({
    id:             r.id,
    idacreditation: r.idacreditation,
    location:       r.location,
    event_type:     r.event_type,
    scanned_at:     r.scanned_at,
    person: {
      fullname:    [r.firstname, r.lastname, r.surname].filter(Boolean).join(" "),
      docnumber:   r.docnumber,
      doctypeName: r.doctype_name,
      photoUrl:    r.photo_ruta ? `${PHOTOS_BASE_URL}${r.photo_ruta}` : null,
    },
    role: { code: r.tregister, name: r.role_name || r.tregister },
  }));
}

async function softDeleteLog({ id, idcompany, idevent, idaccount }) {
  const deletedAt = nowPeru();
  const [result] = await pool.query(
    `UPDATE mobility_logs
     SET deleted_at = ?, deleted_by = ?
     WHERE id = ? AND idcompany = ? AND idevent = ? AND deleted_at IS NULL`,
    [deletedAt, String(idaccount), id, idcompany, idevent]
  );
  if (result.affectedRows === 0) throw new AppError(404, "Registro no encontrado o ya eliminado");
  return { deletedAt };
}

module.exports = { getLogsToday, registerLog, getHistory, softDeleteLog };