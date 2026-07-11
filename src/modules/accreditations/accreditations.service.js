// src/modules/accreditations/accreditations.service.js
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");

const PHOTOS_BASE_URL = process.env.PHOTOS_BASE_URL || "https://master.hayllis.com/writable/uploads/";

const BASE_SELECT = `
  SELECT a.idacreditation, a.idcompany, a.idevent, a.idsport, a.idinstitution,
         a.tregister, a.checkdoc, a.hosting,
         p.idperson, p.idcountry, p.doctype, p.docnumber,
         p.firstname, p.lastname, p.surname,
         docm.name_es AS doctype_name,
         rolm.name_es AS role_name,
         rolm.param2  AS role_color,
         ph.ruta      AS photo_ruta
  FROM accreditation a
  INNER JOIN person p
    ON p.idcompany = a.idcompany AND p.idperson = a.idperson
  LEFT JOIN master_details docm
    ON docm.idcompany = a.idcompany AND docm.idmaster = 4 AND docm.iddetails = p.doctype
  LEFT JOIN master_details rolm
    ON rolm.idcompany = a.idcompany AND rolm.idmaster = 19 AND rolm.iddetails = a.tregister
  LEFT JOIN photos ph
    ON ph.idcompany = a.idcompany AND ph.idphoto = a.idphoto AND ph.mstatus = 1
`;

function mapAccreditation(row) {
  return {
    idacreditation: row.idacreditation,
    idevent:        row.idevent,
    idsport:        row.idsport,
    idinstitution:  row.idinstitution,
    hosting:        row.hosting === 1 || row.hosting === true,
    role: {
      code:  row.tregister,
      name:  row.role_name || row.tregister,
      color: row.role_color || null,
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

async function findByQr({ idcompany, idevent, idacreditation }) {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE a.idcompany = ?
       AND a.idevent = ?
       AND a.idacreditation = ?
       AND a.checkdoc != 2
       AND a.mstatus = 1
     LIMIT 1`,
    [idcompany, idevent, idacreditation]
  );
  if (!rows.length) throw new AppError(404, "Acreditación no encontrada, anulada o inactiva");
  return mapAccreditation(rows[0]);
}

async function findByDocument({ idcompany, idevent, doctype, docnumber }) {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE a.idcompany = ?
       AND a.idevent = ?
       AND p.doctype = ?
       AND p.docnumber = ?
       AND a.checkdoc != 2
       AND a.mstatus = 1
     LIMIT 1`,
    [idcompany, idevent, doctype, docnumber]
  );
  if (!rows.length) throw new AppError(404, "Acreditación no encontrada, anulada o inactiva");
  return mapAccreditation(rows[0]);
}

async function findByDocnumber({ idcompany, idevent, docnumber }) {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE a.idcompany = ?
       AND a.idevent = ?
       AND p.docnumber = ?
       AND a.checkdoc != 2
       AND a.mstatus = 1
     LIMIT 1`,
    [idcompany, idevent, docnumber]
  );
  if (!rows.length) throw new AppError(404, "Acreditación no encontrada, anulada o inactiva");
  return mapAccreditation(rows[0]);
}

module.exports = { findByQr, findByDocument, findByDocnumber };