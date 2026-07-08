// src/modules/companies/companies.service.js
const pool = require("../../config/db");

async function listCompanies() {
  const [rows] = await pool.query(
    `SELECT idcompany, name, alias, avatar
     FROM company
     WHERE mstatus = 1
     ORDER BY name`
  );
  return rows;
}

module.exports = { listCompanies };