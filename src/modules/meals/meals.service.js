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

  const scannedAt = nowPeru(); 

  await pool.query(
    `INSERT INTO meal_records (idcompany, idevent, idacreditation, meal_type, meal_date, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
    [idcompany, idevent, idacreditation, mealType, scannedAt, idaccount]
  );

  return { mealType, scannedAt };
}

async function getHistory({ idcompany, idevent, docnumber, meal_type, date, limit = 100 }) {
  const conditions = ["mr.idcompany = ?", "mr.idevent = ?"];
  const params     = [idcompany, idevent];

  if (docnumber) { conditions.push("p.docnumber LIKE ?");  params.push(`%${docnumber}%`); }
  if (meal_type) { conditions.push("mr.meal_type = ?");    params.push(meal_type); }
  if (date)      { conditions.push("mr.meal_date = ?");    params.push(date); }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT
       mr.idacreditation, mr.meal_type, mr.meal_date, mr.scanned_at,
       p.firstname, p.lastname, p.surname,
       p.docnumber, p.doctype,
       docm.name_es AS doctype_name,
       rolm.name_es AS role_name,
       a.tregister
     FROM meal_records mr
     INNER JOIN accreditation a
       ON a.idcompany = mr.idcompany AND a.idevent = mr.idevent
      AND a.idacreditation = mr.idacreditation
     INNER JOIN person p
       ON p.idcompany = a.idcompany AND p.idperson = a.idperson
     LEFT JOIN master_details docm
       ON docm.idcompany = a.idcompany AND docm.idmaster = 4 AND docm.iddetails = p.doctype
     LEFT JOIN master_details rolm
       ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
     WHERE ${conditions.join(" AND ")}
     ORDER BY mr.scanned_at DESC
     LIMIT ?`,
    params
  );

  return rows.map((r) => ({
    idacreditation: r.idacreditation,
    meal_type:      r.meal_type,
    meal_date:      r.meal_date,
    scanned_at:     r.scanned_at,
    person: {
      fullname:    [r.firstname, r.lastname, r.surname].filter(Boolean).join(" "),
      docnumber:   r.docnumber,
      doctypeName: r.doctype_name,
    },
    role: { code: r.tregister, name: r.role_name || r.tregister },
  }));
}

module.exports = { getTodayStatus, checkMeal, getHistory };