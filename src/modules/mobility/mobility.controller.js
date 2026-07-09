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
    const [qrDoctype, qrDocnumber] = qr.split("-", 2);
    if (!qrDoctype || !qrDocnumber) throw new AppError(400, "Formato de QR inválido");
    accreditation = await accreditations.findByDocument({
      idcompany,
      idevent,
      doctype: qrDoctype.trim(),
      docnumber: qrDocnumber.trim(),
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