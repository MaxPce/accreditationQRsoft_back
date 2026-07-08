// src/modules/events/events.service.js
const pool = require("../../config/db");

async function listEventsByCompany(idcompany) {
  const [rows] = await pool.query(
    `SELECT idcompany, idevent, name, tipo, place, startdate, enddate, logo, slug
     FROM events
     WHERE idcompany = ? AND mstatus IN (1,2)
     ORDER BY startdate DESC`,
    [idcompany]
  );
  return rows;
}

module.exports = { listEventsByCompany };