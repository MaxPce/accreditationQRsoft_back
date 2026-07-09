// src/modules/competition/competition.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

const BASE_SELECT = `
  SELECT a.idacreditation, a.idcompany, a.idevent, a.idsport, a.idinstitution,
         a.tregister, a.checkdoc,
         p.idperson, p.idcountry, p.doctype, p.docnumber,
         p.firstname, p.lastname, p.surname,
         docm.name_es AS doctype_name,
         rolm.name_es AS role_name
  FROM accreditation a
  INNER JOIN person p
    ON p.idcompany = a.idcompany AND p.idperson = a.idperson
  LEFT JOIN master_details docm
    ON docm.idcompany = a.idcompany AND docm.idmaster = 4 AND docm.iddetails = p.doctype
  LEFT JOIN master_details rolm
    ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
`;

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
    },
  };
}

// Busca por docnumber (el QR contiene el número de documento, igual que village)
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

// Busca por doctype + docnumber (búsqueda manual)
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

// Valida si el atleta tiene pruebas en accreditation_test para el idsport seleccionado
async function validateCompetition({ idcompany, idevent, accreditation, idsport }) {
  const idspNum = Number(idsport);

  const [tests] = await pool.query(
    `SELECT at.idtest, sp.name AS test_name, at.idniv, at.idcat
     FROM accreditation_test at
     LEFT JOIN sport_params sp
       ON sp.idcompany = at.idcompany AND sp.code = at.idtest
     WHERE at.idcompany = ? AND at.idevent = ?
       AND at.idacreditation = ? AND at.idsport = ?
       AND at.mstatus = 1`,
    [idcompany, idevent, accreditation.idacreditation, idspNum]
  );

  const sportMatch  = accreditation.idsport === idspNum;
  const hasTests    = tests.length > 0;
  const authorized  = sportMatch && hasTests;

  let reason = null;
  if (!authorized) {
    reason = !sportMatch
      ? "El atleta no pertenece a este deporte"
      : "El atleta no tiene pruebas inscritas en este deporte";
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

// Lista deportes activos de la empresa (sin event_sport)
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


module.exports = { findByDocnumber, findByDocument, validateCompetition, listSports };