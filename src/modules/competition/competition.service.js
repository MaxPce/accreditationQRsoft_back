// src/modules/competition/competition.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

const PHOTOS_BASE_URL = process.env.PHOTOS_BASE_URL || "https://master.hayllis.com/writable/uploads/";

const BASE_SELECT = `
  SELECT a.idacreditation, a.idcompany, a.idevent, a.idsport, a.idinstitution,
         a.tregister, a.checkdoc,
         p.idperson, p.idcountry, p.doctype, p.docnumber,
         p.firstname, p.lastname, p.surname,
         docm.name_es AS doctype_name,
         rolm.name_es AS role_name,
         ph.ruta AS photo_ruta
  FROM accreditation a
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
`;

function nowPeru() {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "America/Lima" })
    .replace("T", " ");
}

function mapAccreditation(row) {
  return {
    idacreditation: row.idacreditation,
    idevent:        row.idevent,
    idsport:        row.idsport,
    idinstitution:  row.idinstitution,
    role: {
      code: row.tregister,
      name: row.role_name || row.tregister,
    },
    person: {
      idperson:    row.idperson,
      fullname:    [row.firstname, row.lastname, row.surname].filter(Boolean).join(" "),
      idcountry:   row.idcountry,
      doctype:     row.doctype,
      doctypeName: row.doctype_name,
      docnumber:   row.docnumber,
      photoUrl:    row.photo_ruta ? `${PHOTOS_BASE_URL}${row.photo_ruta}` : null,
    },
  };
}

async function findByDocnumber({ idcompany, idevent, docnumber }) {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE a.idcompany = ? AND a.idevent = ? AND p.docnumber = ?
       AND a.checkdoc != 2 AND a.mstatus = 1
     LIMIT 1`,
    [idcompany, idevent, docnumber]
  );
  if (!rows.length) throw new AppError(404, "Acreditación no encontrada, anulada o inactiva");
  return mapAccreditation(rows[0]);
}

async function findByDocument({ idcompany, idevent, doctype, docnumber }) {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE a.idcompany = ? AND a.idevent = ?
       AND p.doctype = ? AND p.docnumber = ?
       AND a.checkdoc != 2 AND a.mstatus = 1
     LIMIT 1`,
    [idcompany, idevent, doctype, docnumber]
  );
  if (!rows.length) throw new AppError(404, "Acreditación no encontrada, anulada o inactiva");
  return mapAccreditation(rows[0]);
}

async function validateCompetition({ idcompany, idevent, accreditation, idsport, idsport_param }) {
  const idspNum = Number(idsport);

  let testsQuery = `
    SELECT at.idtest, sp.name AS test_name, at.idniv, at.idcat
    FROM accreditation_test at
    LEFT JOIN sport_params sp
      ON sp.idcompany = at.idcompany AND sp.code = at.idtest
    WHERE at.idcompany = ? AND at.idevent = ?
      AND at.idacreditation = ? AND at.idsport = ?
      AND at.mstatus = 1
  `;
  const testsParams = [idcompany, idevent, accreditation.idacreditation, idspNum];

  if (idsport_param) {
    testsQuery += ` AND at.idtest = ?`;
    testsParams.push(String(idsport_param));
  }

  const [tests] = await pool.query(testsQuery, testsParams);

  const sportMatch = accreditation.idsport === idspNum;
  const hasTests   = tests.length > 0;
  const authorized = sportMatch && hasTests;

  let reason = null;
  if (!authorized) {
    if (!sportMatch) {
      reason = "El atleta no pertenece a este deporte";
    } else if (idsport_param) {
      reason = "El atleta no está inscrito en esta prueba/categoría";
    } else {
      reason = "El atleta no tiene pruebas inscritas en este deporte";
    }
  }

  return {
    authorized,
    accreditation,
    tests: tests.map((t) => ({
      idtest:   t.idtest,
      name:     t.test_name || t.idtest,
      level:    t.idniv,
      category: t.idcat,
    })),
    reason,
  };
}

async function registerEntry({ idcompany, idevent, idacreditation, idsport, idtest, idaccount }) {
  const scannedAt = nowPeru();
  await pool.query(
    `INSERT INTO competition_records
       (idcompany, idevent, idacreditation, idsport, idtest, scanned_at, idaccount)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idcompany, idevent, idacreditation, Number(idsport), idtest ?? null, scannedAt, idaccount ?? null]
  );
  return { scannedAt };
}

async function getHistory({ idcompany, idevent, docnumber, idsport, idtest, limit = 100 }) {
  const conditions = ["cr.idcompany = ?", "cr.idevent = ?"];
  const params     = [idcompany, idevent];

  if (docnumber) { conditions.push("p.docnumber LIKE ?"); params.push(`%${docnumber}%`); }
  if (idsport)   { conditions.push("cr.idsport = ?");     params.push(Number(idsport)); }
  if (idtest)    { conditions.push("cr.idtest = ?");      params.push(idtest); }

  params.push(Number(limit));

  const [rows] = await pool.query(
    `SELECT
       cr.id, cr.idacreditation, cr.idsport, cr.idtest, cr.scanned_at,
       s.name_es AS sport_name, s.acronym AS sport_acronym,
       p.firstname, p.lastname, p.surname,
       p.docnumber, p.doctype,
       docm.name_es AS doctype_name,
       rolm.name_es AS role_name,
       a.tregister,
       sp.name AS test_name,
       ph.ruta AS photo_ruta
     FROM competition_records cr
     INNER JOIN accreditation a
       ON a.idcompany = cr.idcompany AND a.idevent = cr.idevent
      AND a.idacreditation = cr.idacreditation
     INNER JOIN person p
       ON p.idcompany = a.idcompany AND p.idperson = a.idperson
     INNER JOIN sport s
       ON s.idcompany = cr.idcompany AND s.idsport = cr.idsport
     LEFT JOIN master_details docm
       ON docm.idcompany = a.idcompany AND docm.idmaster = 4 AND docm.iddetails = p.doctype
     LEFT JOIN master_details rolm
       ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
     LEFT JOIN sport_params sp
       ON sp.idcompany = cr.idcompany AND sp.code = cr.idtest
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
     ORDER BY cr.scanned_at DESC
     LIMIT ?`,
    params
  );

  
  return rows.map((r) => ({
    id:             r.id,
    idacreditation: r.idacreditation,
    idsport:        r.idsport,
    idtest:         r.idtest  ?? null,
    sport_name:     r.sport_name,
    sport_acronym:  r.sport_acronym,
    test_name:      r.test_name ?? null,
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

async function listSports({ idcompany, idevent }) {
  const [rows] = await pool.query(
    `SELECT DISTINCT s.idsport, s.name_es, s.acronym
     FROM sport s
     INNER JOIN accreditation_test at
       ON at.idcompany = s.idcompany
      AND at.idsport   = s.idsport
      AND at.idevent   = ?
      AND at.mstatus   = 1
     WHERE s.idcompany = ?
       AND s.mstatus   = 1
     ORDER BY s.name_es ASC`,
    [idevent, idcompany]
  );
  return rows;
}

async function listTestsBySport({ idcompany, idevent, idsport }) {
  const [rows] = await pool.query(
    `SELECT DISTINCT sp.code, sp.name
     FROM accreditation_test at
     INNER JOIN sport_params sp
       ON sp.idcompany = at.idcompany AND sp.code = at.idtest
     WHERE at.idcompany = ? AND at.idevent = ? AND at.idsport = ?
       AND at.mstatus = 1
     ORDER BY sp.name ASC`,
    [idcompany, idevent, Number(idsport)]
  );
  return rows;
}

module.exports = {
  findByDocnumber,
  findByDocument,
  validateCompetition,
  registerEntry,
  getHistory,
  listSports,
  listTestsBySport,
};