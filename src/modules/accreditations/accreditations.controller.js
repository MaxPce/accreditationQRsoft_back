// src/modules/accreditations/accreditations.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const service = require("./accreditations.service");

exports.lookupByQr = asyncHandler(async (req, res) => {
  const { qr } = req.query;
  const { idcompany, idevent } = req.user;
  if (!qr) throw new AppError(400, "Debe enviar el parámetro qr");

  const accreditation = await service.findByQr({
    idcompany,
    idevent,
    idacreditation: qr,
  });
  res.json({ ok: true, accreditation });
});

exports.lookupByDocument = asyncHandler(async (req, res) => {
  const { doctype, docnumber } = req.query;
  const { idcompany, idevent } = req.user;
  if (!doctype || !docnumber) {
    throw new AppError(400, "Debe enviar doctype y docnumber");
  }

  const accreditation = await service.findByDocument({
    idcompany,
    idevent,
    doctype,
    docnumber,
  });
  res.json({ ok: true, accreditation });
});