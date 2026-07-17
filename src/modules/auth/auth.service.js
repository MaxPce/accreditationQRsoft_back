// src/modules/auth/auth.service.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const AppError = require("../../utils/AppError");
const { jwt: jwtConfig } = require("../../config/env");

const MAX_ATTEMPTS = 5;

async function login({ idcompany, username, password }) {
  const [rows] = await pool.query(
    `SELECT * FROM accounts
     WHERE idcompany = ? AND username = ? AND mstatus = 1
     LIMIT 1`,
    [idcompany, username]
  );

  if (!rows.length) throw new AppError(404, "Usuario no encontrado");
  const account = rows[0];

  if (Number(account.accstatus) !== 1) {
    throw new AppError(403, "Cuenta deshabilitada, contacte al administrador");
  }

  if (account.date_end && new Date(account.date_end) < new Date()) {
    throw new AppError(403, "La cuenta ha expirado");
  }

  const passwordMatch = bcrypt.compareSync(password, account.password);

  if (!passwordMatch) {
    const attempts = Number(account.failed_attempts) + 1;
    const shouldBlock = attempts >= MAX_ATTEMPTS;

    await pool.query(
      `UPDATE accounts
       SET failed_attempts = ?, accstatus = ?
       WHERE idcompany = ? AND idaccount = ?`,
      [attempts, shouldBlock ? 0 : 1, account.idcompany, account.idaccount]
    );

    if (shouldBlock) {
      throw new AppError(403, "Cuenta bloqueada por intentos fallidos");
    }
    throw new AppError(401, "Contraseña incorrecta");
  }

  await pool.query(
    `UPDATE accounts SET failed_attempts = 0
     WHERE idcompany = ? AND idaccount = ?`,
    [account.idcompany, account.idaccount]
  );

  const token = jwt.sign(
    {
      idcompany: account.idcompany,
      idaccount: account.idaccount,
      idperson: account.idperson,
      idperfil: account.idperfil,
      idfunction: account.idfunction,
      username: account.username,
      stage: "company_logged",
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  return {
    token,
    account: {
      idcompany: account.idcompany,
      idaccount: account.idaccount,
      username: account.username,
      avatar: account.avatar,
      email: account.email,
    },
  };
}

async function selectEvent({ idcompany, idaccount, idperson, idperfil, idfunction, username, idevent }) {
  const [rows] = await pool.query(
    `SELECT idcompany, idevent, name
     FROM events
     WHERE idcompany = ? AND idevent = ? AND mstatus IN (1,2)
     LIMIT 1`,
    [idcompany, idevent]
  );

  if (!rows.length) throw new AppError(404, "Evento no encontrado para esta compañía");
  const event = rows[0];

  const token = jwt.sign(
    {
      idcompany,
      idaccount,
      idperson,
      idperfil,
      idfunction,
      username,
      idevent: event.idevent,
      eventName: event.name,
      stage: "event_selected",
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

  return { token, event };
}

module.exports = { login, selectEvent };