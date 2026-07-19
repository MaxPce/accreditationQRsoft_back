// src/modules/stats/stats.service.js
const pool = require("../../config/db");

// ─── COMEDOR ─────────────────────────────────────────────────────────────────

/** Totales por servicio (desayuno/almuerzo/cena) en una fecha */
async function getMealStatsByDate({ idcompany, idevent, date }) {
  const targetDate = date || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  const [rows] = await pool.query(
    `SELECT
       meal_type,
       COUNT(*) AS total
     FROM meal_records
     WHERE idcompany = ? AND idevent = ?
       AND meal_date = ?
       AND deleted_at IS NULL
     GROUP BY meal_type
     ORDER BY FIELD(meal_type, 'desayuno', 'almuerzo', 'cena')`,
    [idcompany, idevent, targetDate]
  );

  const base = { desayuno: 0, almuerzo: 0, cena: 0 };
  rows.forEach((r) => { base[r.meal_type] = Number(r.total); });
  return { date: targetDate, byService: base, total: Object.values(base).reduce((a, b) => a + b, 0) };
}

/** Totales por servicio agrupados por día (últimos N días) */
async function getMealStatsByRange({ idcompany, idevent, days = 7 }) {
  const [rows] = await pool.query(
    `SELECT
       meal_date,
       meal_type,
       COUNT(*) AS total
     FROM meal_records
     WHERE idcompany = ? AND idevent = ?
       AND meal_date >= CURDATE() - INTERVAL ? DAY
       AND deleted_at IS NULL
     GROUP BY meal_date, meal_type
     ORDER BY meal_date ASC, FIELD(meal_type, 'desayuno', 'almuerzo', 'cena')`,
    [idcompany, idevent, days]
  );

  // Agrupar por fecha
  const map = {};
  rows.forEach(({ meal_date, meal_type, total }) => {
    const key = meal_date instanceof Date
      ? meal_date.toLocaleDateString("sv-SE")
      : String(meal_date).slice(0, 10);
    if (!map[key]) map[key] = { date: key, desayuno: 0, almuerzo: 0, cena: 0 };
    map[key][meal_type] = Number(total);
  });
  return Object.values(map);
}

/** Totales por rol (tregister) para el comedor hoy */
async function getMealStatsByRole({ idcompany, idevent, date }) {
  const targetDate = date || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  const [rows] = await pool.query(
    `SELECT
       a.tregister,
       COALESCE(rolm.name_es, a.tregister) AS role_name,
       mr.meal_type,
       COUNT(*) AS total
     FROM meal_records mr
     INNER JOIN accreditation a
       ON a.idcompany = mr.idcompany AND a.idevent = mr.idevent
      AND a.idacreditation = mr.idacreditation
     LEFT JOIN master_details rolm
       ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
     WHERE mr.idcompany = ? AND mr.idevent = ?
       AND mr.meal_date = ?
       AND mr.deleted_at IS NULL
     GROUP BY a.tregister, role_name, mr.meal_type
     ORDER BY a.tregister, FIELD(mr.meal_type, 'desayuno', 'almuerzo', 'cena')`,
    [idcompany, idevent, targetDate]
  );

  const map = {};
  rows.forEach(({ tregister, role_name, meal_type, total }) => {
    if (!map[tregister]) map[tregister] = { role: tregister, roleName: role_name, desayuno: 0, almuerzo: 0, cena: 0, total: 0 };
    map[tregister][meal_type] = Number(total);
    map[tregister].total += Number(total);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ─── MÓDULOS (movilidad, villa, competencia) ──────────────────────────────────

/** Ingresos por módulo/location para un rango de fechas */
async function getModuleStatsByDate({ idcompany, idevent, date }) {
  const targetDate = date || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  const [rows] = await pool.query(
    `SELECT
       location,
       event_type,
       COUNT(*) AS total
     FROM mobility_logs
     WHERE idcompany = ? AND idevent = ?
       AND DATE(scanned_at) = ?
       AND deleted_at IS NULL
     GROUP BY location, event_type`,
    [idcompany, idevent, targetDate]
  );

  const map = {};
  rows.forEach(({ location, event_type, total }) => {
    if (!map[location]) map[location] = { location, llegada: 0, salida: 0, total: 0 };
    map[location][event_type] = Number(total);
    map[location].total += Number(total);
  });
  return { date: targetDate, byModule: Object.values(map) };
}

/** Ingresos por módulo en los últimos N días */
async function getModuleStatsByRange({ idcompany, idevent, days = 7 }) {
  const [rows] = await pool.query(
    `SELECT
       DATE(scanned_at) AS log_date,
       location,
       event_type,
       COUNT(*) AS total
     FROM mobility_logs
     WHERE idcompany = ? AND idevent = ?
       AND DATE(scanned_at) >= CURDATE() - INTERVAL ? DAY
       AND deleted_at IS NULL
     GROUP BY log_date, location, event_type
     ORDER BY log_date ASC`,
    [idcompany, idevent, days]
  );

  const map = {};
  rows.forEach(({ log_date, location, event_type, total }) => {
    const key = log_date instanceof Date
      ? log_date.toLocaleDateString("sv-SE")
      : String(log_date).slice(0, 10);
    if (!map[key]) map[key] = { date: key };
    const locKey = `${location}_${event_type}`;
    map[key][locKey] = Number(total);
  });
  return Object.values(map);
}

/** Resumen general del día: totales por módulo incluyendo meals */
async function getDailySummary({ idcompany, idevent, date }) {
  const targetDate = date || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  const [mealRows] = await pool.query(
    `SELECT meal_type, COUNT(*) AS total
     FROM meal_records
     WHERE idcompany = ? AND idevent = ? AND meal_date = ? AND deleted_at IS NULL
     GROUP BY meal_type`,
    [idcompany, idevent, targetDate]
  );

  const [mobilityRows] = await pool.query(
    `SELECT location, event_type, COUNT(*) AS total
     FROM mobility_logs
     WHERE idcompany = ? AND idevent = ?
       AND DATE(scanned_at) = ? AND deleted_at IS NULL
     GROUP BY location, event_type`,
    [idcompany, idevent, targetDate]
  );

  const meals = { desayuno: 0, almuerzo: 0, cena: 0 };
  mealRows.forEach((r) => { meals[r.meal_type] = Number(r.total); });

  const mobility = {};
  mobilityRows.forEach(({ location, event_type, total }) => {
    if (!mobility[location]) mobility[location] = { llegada: 0, salida: 0 };
    mobility[location][event_type] = Number(total);
  });

  return { date: targetDate, meals, mobility };
}

// ─── VILLA ────────────────────────────────────────────────────────────────────

/** Ingresos a la villa por fecha, agrupados por edificio/torre */
async function getVillaStatsByDate({ idcompany, idevent, date }) {
  const targetDate = date || new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

  const [rows] = await pool.query(
    `SELECT
       ve.idbuilding,
       COALESCE(md.name_es, CONCAT('Torre ', ve.idbuilding), 'Sin torre') AS building_name,
       ve.gate,
       COUNT(*) AS total
     FROM village_entries ve
     LEFT JOIN master_details md
       ON md.idcompany = ve.idcompany AND md.idmaster = 'TOWER' AND md.iddetails = ve.idbuilding
     WHERE ve.idcompany = ? AND ve.idevent = ?
       AND DATE(ve.scanned_at) = ?
     GROUP BY ve.idbuilding, building_name, ve.gate
     ORDER BY ve.idbuilding ASC, ve.gate ASC`,
    [idcompany, idevent, targetDate]
  );

  // Agrupar por edificio
  const map = {};
  let grandTotal = 0;
  rows.forEach(({ idbuilding, building_name, gate, total }) => {
    const key = idbuilding ?? "sin_torre";
    if (!map[key]) map[key] = { idbuilding: key, building_name, puerta1: 0, puerta2: 0, sin_puerta: 0, total: 0 };
    const gateKey = gate === "puerta1" ? "puerta1" : gate === "puerta2" ? "puerta2" : "sin_puerta";
    map[key][gateKey] += Number(total);
    map[key].total    += Number(total);
    grandTotal        += Number(total);
  });

  return { date: targetDate, byBuilding: Object.values(map), grandTotal };
}

/** Ingresos a la villa agrupados por día (últimos N días) */
async function getVillaStatsByRange({ idcompany, idevent, days = 7 }) {
  const [rows] = await pool.query(
    `SELECT
       DATE(scanned_at) AS entry_date,
       COUNT(*) AS total
     FROM village_entries
     WHERE idcompany = ? AND idevent = ?
       AND DATE(scanned_at) >= CURDATE() - INTERVAL ? DAY
     GROUP BY entry_date
     ORDER BY entry_date ASC`,
    [idcompany, idevent, days]
  );

  return rows.map(({ entry_date, total }) => ({
    date: entry_date instanceof Date
      ? entry_date.toLocaleDateString("sv-SE")
      : String(entry_date).slice(0, 10),
    total: Number(total),
  }));
}

module.exports = {
  getMealStatsByDate,
  getMealStatsByRange,
  getMealStatsByRole,
  getModuleStatsByDate,
  getModuleStatsByRange,
  getDailySummary,
  getVillaStatsByDate,    
  getVillaStatsByRange,   
};
