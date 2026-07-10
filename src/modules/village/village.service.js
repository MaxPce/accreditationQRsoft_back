// src/modules/village/village.service.js  
const pool     = require("../../config/db");
const AppError = require("../../utils/AppError");

const VALID_GATES = ["puerta1", "puerta2"];

function nowPeru() {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");
}

async function getEntriesToday({ idcompany, idevent, idacreditation }) {
  const [rows] = await pool.query(
    `SELECT gate, idbuilding, scanned_at FROM village_entries
     WHERE idcompany = ? AND idevent = ? AND idacreditation = ?
       AND DATE(scanned_at) = CURDATE()
     ORDER BY scanned_at DESC`,
    [idcompany, idevent, idacreditation]
  );
  return rows;
}

async function registerEntry({ idcompany, idevent, idacreditation, gate, idbuilding, idaccount }) {
  // gate puede ser null cuando el registro es por edificio (sin puerta)
  if (gate !== null && gate !== undefined && !VALID_GATES.includes(gate)) {
    throw new AppError(400, "Puerta inválida, use puerta1 o puerta2");
  }

  const scannedAt = nowPeru();
  await pool.query(
    `INSERT INTO village_entries (idcompany, idevent, idacreditation, gate, idbuilding, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idcompany, idevent, idacreditation, gate ?? null, idbuilding ?? null, scannedAt, idaccount ?? null]
  );
  return { gate: gate ?? null, idbuilding: idbuilding ?? null, scannedAt };
}

// Obtener el idcountry del atleta acreditado (para validación de edificio)
async function getAccreditationCountry({ idcompany, idevent, idacreditation }) {
  const [rows] = await pool.query(
    `SELECT p.idcountry
     FROM accreditation a
     INNER JOIN person p ON p.idcompany = a.idcompany AND p.idperson = a.idperson
     WHERE a.idcompany = ? AND a.idevent = ? AND a.idacreditation = ?
     LIMIT 1`,
    [idcompany, idevent, idacreditation]
  );
  if (!rows.length) throw new AppError(404, "Acreditación no encontrada");
  return rows[0].idcountry;
}

async function validateBuildingAccess({ idcompany, idevent, idbuilding, idcountry }) {
  const [rows] = await pool.query(
    `SELECT 1 FROM village_building_countries
     WHERE idcompany = ? AND idevent = ? AND idbuilding = ? AND idcountry = ?
     LIMIT 1`,
    [idcompany, idevent, idbuilding, idcountry]
  );
  return rows.length > 0;
}

async function listBuildings({ idcompany }) {
  const [rows] = await pool.query(
    `SELECT iddetails AS idbuilding, name_es, name_en
     FROM master_details
     WHERE idcompany = ? AND idmaster = 'TOWER' AND deleted_at IS NULL
     ORDER BY iddetails ASC`,
    [idcompany]
  );
  return rows;
}

async function getBuildingCountries({ idcompany, idevent, idbuilding }) {
  const [rows] = await pool.query(
    `SELECT vbc.id, vbc.idcountry, c.name AS country_name
     FROM village_building_countries vbc
     LEFT JOIN countries c ON c.idcountry = vbc.idcountry
     WHERE vbc.idcompany = ? AND vbc.idevent = ? AND vbc.idbuilding = ?`,
    [idcompany, idevent, idbuilding]
  );
  return rows;
}

async function assignCountryToBuilding({ idcompany, idevent, idbuilding, idcountry, idaccount }) {
  await pool.query(
    `INSERT IGNORE INTO village_building_countries (idcompany, idevent, idbuilding, idcountry, idaccount)
     VALUES (?, ?, ?, ?, ?)`,
    [idcompany, idevent, idbuilding, idcountry, idaccount ?? null]
  );
}

async function removeCountryFromBuilding({ idcompany, idevent, idbuilding, idcountry }) {
  await pool.query(
    `DELETE FROM village_building_countries
     WHERE idcompany = ? AND idevent = ? AND idbuilding = ? AND idcountry = ?`,
    [idcompany, idevent, idbuilding, idcountry]
  );
}

async function listAllCountries() {
  const [rows] = await pool.query(
    `SELECT idcountry, name FROM countries ORDER BY name ASC`
  );
  return rows;
}

module.exports = {
  getEntriesToday,
  registerEntry,
  getAccreditationCountry,
  validateBuildingAccess,
  listBuildings,
  getBuildingCountries,
  assignCountryToBuilding,
  removeCountryFromBuilding,
  listAllCountries,
};