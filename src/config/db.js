// src/config/db.js
const mysql = require("mysql2/promise");
const { db } = require("./env");

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: "-05:00",
  initializationCommands: [
    "SET time_zone = '-05:00'",
  ],
  connectTimeout: 10000, 
});

pool.getConnection()
  .then(conn => {
    console.log("✅ DB conectada correctamente");
    console.log("Host:", db.host, "| Puerto:", db.port, "| DB:", db.database);
    conn.release();
  })
  .catch(err => {
    console.error("❌ Error de conexión a la DB:", err.message);
    console.error("Host usado:", db.host, "| Puerto:", db.port, "| DB:", db.database);
  });

module.exports = pool;