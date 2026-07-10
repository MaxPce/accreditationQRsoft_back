// src/modules/village/village.service.js  
const pool     = require("../../config/db");
const AppError = require("../../utils/AppError");

const VALID_GATES = ["puerta1", "puerta2"];

function nowPeru() {
  return new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace("T", " ");
}

async function getEntriesToday({ idcompany, idevent, idacreditation, idbuilding = null }) {
  const conditions = [
    "idcompany = ?",
    "idevent = ?",
    "idacreditation = ?",
    "DATE(scanned_at) = CURDATE()",
  ];
  const params = [idcompany, idevent, idacreditation];

  if (idbuilding !== null && idbuilding !== undefined) {
    conditions.push("idbuilding = ?");
    params.push(idbuilding);
  }

  const [rows] = await pool.query(
    `SELECT gate, idbuilding, scanned_at FROM village_entries
     WHERE ${conditions.join(" AND ")}
     ORDER BY scanned_at DESC`,
    params
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



async function getHistory({ idcompany, idevent, docnumber, idbuilding, gate, date, limit = 100 }) {
  const conditions = ["ve.idcompany = ?", "ve.idevent = ?"];
  const params     = [idcompany, idevent];

  if (docnumber)  { conditions.push("p.docnumber LIKE ?");  params.push(`%${docnumber}%`); }
  if (idbuilding === "__null__") {
      conditions.push("ve.idbuilding IS NULL");
    } else if (idbuilding) {
      conditions.push("ve.idbuilding = ?");
      params.push(idbuilding);
    }

  if (gate === "__null__") {
    conditions.push("ve.gate IS NULL");
  } else if (gate) {
    conditions.push("ve.gate = ?");
    params.push(gate);
  }

  if (date)       { conditions.push("DATE(ve.scanned_at) = ?"); params.push(date); }

  params.push(limit);

  const [rows] = await pool.query(
    `SELECT
       ve.idacreditation, ve.gate, ve.idbuilding, ve.scanned_at,
       p.firstname, p.lastname, p.surname, p.docnumber,
       md.name_es AS building_name,
       rolm.name_es AS role_name,
       a.tregister,
       c.name AS country_name
     FROM village_entries ve
     INNER JOIN accreditation a
       ON a.idcompany = ve.idcompany AND a.idevent = ve.idevent
      AND a.idacreditation = ve.idacreditation
     INNER JOIN person p
       ON p.idcompany = a.idcompany AND p.idperson = a.idperson
     LEFT JOIN master_details md
       ON md.idcompany = ve.idcompany AND md.idmaster = 'TOWER' AND md.iddetails = ve.idbuilding
     LEFT JOIN master_details rolm
       ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
     LEFT JOIN countries c
      ON c.idcountry = p.idcountry
     WHERE ${conditions.join(" AND ")}
     ORDER BY ve.scanned_at DESC
     LIMIT ?`,
    params
  );

  return rows.map((r) => ({
    idacreditation: r.idacreditation,
    gate:           r.gate,
    idbuilding:     r.idbuilding,
    building_name:  r.building_name ?? null,
    scanned_at:     r.scanned_at,
    person: {
      fullname:  [r.firstname, r.lastname, r.surname].filter(Boolean).join(" "),
      docnumber: r.docnumber,
    },
    role:         { code: r.tregister, name: r.role_name || r.tregister },
    country_name: r.country_name ?? null,
  }));
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
  getHistory,  
};