// src/modules/meals/meals.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

function nowPeru() {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");
}

function todayPeru() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
  // Devuelve "2026-07-19" siempre en hora Lima, sin depender de MySQL
}


async function getTodayStatus({ idcompany, idevent, idacreditation }) {
  const today = todayPeru(); // ✅ AGREGAR

  const [rows] = await pool.query(
    `SELECT meal_type, scanned_at FROM meal_records
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ?
       AND meal_date = ?              -- ✅ era CURDATE()
       AND deleted_at IS NULL`,
    [idcompany, idevent, idacreditation, today] // ✅ agregar today
  );
  const taken = {};
  rows.forEach((r) => (taken[r.meal_type] = r.scanned_at));
  return taken;
}


async function checkMeal({ idcompany, idevent, idacreditation, mealType, idaccount }) {
  const validTypes = ["desayuno", "almuerzo", "cena"];
  if (!validTypes.includes(mealType)) throw new AppError(400, "Tipo de comida inválido");

  const today = todayPeru(); // ✅ AGREGAR

  const [existing] = await pool.query(
    `SELECT id, scanned_at FROM meal_records
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ?
       AND meal_type = ? AND meal_date = ?   -- ✅ era CURDATE()
       AND deleted_at IS NULL`,
    [idcompany, idevent, idacreditation, mealType, today] // ✅ agregar today
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
     VALUES (?, ?, ?, ?, ?, ?, ?)`,  // ✅ era CURDATE(), ahora es ?
    [idcompany, idevent, idacreditation, mealType, today, scannedAt, idaccount] // ✅ agregar today
  );

  return { mealType, scannedAt };
}


async function getHistory({ idcompany, idevent, docnumber, meal_type, date, limit = 100 }) {
  const conditions = ["mr.idcompany = ?", "mr.idevent = ?", "mr.deleted_at IS NULL"];
  const params     = [idcompany, idevent];

  if (docnumber) { conditions.push("p.docnumber LIKE ?");  params.push(`%${docnumber}%`); }
  if (meal_type) { conditions.push("mr.meal_type = ?");    params.push(meal_type); }
  if (date)      { conditions.push("mr.meal_date = ?");    params.push(date); }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT
       mr.id, mr.idacreditation, mr.meal_type, mr.meal_date, mr.scanned_at,
       p.firstname, p.lastname, p.surname,
       p.docnumber, p.doctype,
       docm.name_es AS doctype_name,
       rolm.name_es AS role_name,
       a.tregister,
       ph.ruta AS photo_ruta
     FROM meal_records mr
     INNER JOIN accreditation a ON a.idcompany = mr.idcompany AND a.idevent = mr.idevent AND a.idacreditation = mr.idacreditation
     INNER JOIN person p ON p.idcompany = a.idcompany AND p.idperson = a.idperson
     LEFT JOIN master_details docm ON docm.idcompany = a.idcompany AND docm.idmaster = 4 AND docm.iddetails = p.doctype
     LEFT JOIN master_details rolm ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
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
     ORDER BY mr.scanned_at DESC
     LIMIT ?`,
    params
  );

  const PHOTOS_BASE_URL = process.env.PHOTOS_BASE_URL || "https://master.hayllis.com/writable/uploads/";

  return rows.map((r) => ({
    id:             r.id,
    idacreditation: r.idacreditation,
    meal_type:      r.meal_type,
    meal_date:      r.meal_date,
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

async function softDeleteMeal({ id, idcompany, idevent, idaccount }) {
  const deletedAt = nowPeru();
  const [result] = await pool.query(
    `UPDATE meal_records
     SET deleted_at = ?, deleted_by = ?
     WHERE id = ? AND idcompany = ? AND idevent = ? AND deleted_at IS NULL`,
    [deletedAt, idaccount, id, idcompany, idevent]
  );
  if (result.affectedRows === 0) throw new AppError(404, "Registro no encontrado o ya eliminado");
  return { deletedAt };
}

module.exports = { getTodayStatus, checkMeal, getHistory, softDeleteMeal };