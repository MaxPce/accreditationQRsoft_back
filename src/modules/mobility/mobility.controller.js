// src/modules/mobility/mobility.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const accreditations = require("../accreditations/accreditations.service");
const service = require("./mobility.service");

exports.lookup = asyncHandler(async (req, res) => {
  const { qr, doctype, docnumber } = req.query;
  const { idcompany, idevent } = req.user;

  let accreditation;

  if (qr) {
    const docnumber = qr.trim();
    if (!docnumber) throw new AppError(400, "QR inválido");
    accreditation = await accreditations.findByDocnumber({
        idcompany,
        idevent,
        docnumber,
    });
    } else {
    accreditation = await accreditations.findByDocument({
      idcompany,
      idevent,
      doctype,
      docnumber,
    });
  }

  const logsToday = await service.getLogsToday({
    idcompany,
    idevent,
    idacreditation: accreditation.idacreditation,
  });

  res.json({ ok: true, accreditation, logsToday });
});

exports.registerLog = asyncHandler(async (req, res) => {
  const { idacreditation, location, event_type } = req.body;
  const { idcompany, idevent, idaccount } = req.user;

  const result = await service.registerLog({
    idcompany,
    idevent,
    idacreditation,
    location,
    event_type,
    idaccount,
  });

  res.json({ ok: true, ...result });
});

exports.getHistory = asyncHandler(async (req, res) => {
  const { docnumber, location, date } = req.query;
  const { idcompany, idevent } = req.user;

  const records = await service.getHistory({
    idcompany,
    idevent,
    docnumber: docnumber || null,
    location:  location  || null,
    date:      date      || null,
  });
  res.json({ ok: true, records });
});