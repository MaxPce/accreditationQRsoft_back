// src/modules/competition/competition.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const AppError     = require("../../utils/AppError");
const service      = require("./competition.service");

// GET /api/competition/sports  — lista deportes para el selector
exports.listSports = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user; 
  const sports = await service.listSports({ idcompany, idevent }); 
  res.json({ ok: true, sports });
});

// GET /api/competition/validate?qr=XXXXX&idsport=9
exports.validateByQr = asyncHandler(async (req, res) => {
  const { qr, idsport } = req.query;
  const { idcompany, idevent } = req.user;
  if (!qr)      throw new AppError(400, "Debe enviar el parámetro qr");
  if (!idsport) throw new AppError(400, "Debe enviar el parámetro idsport");

  // El QR trae el docnumber (mismo patrón que village)
  const accreditation = await service.findByDocnumber({
    idcompany,
    idevent,
    docnumber: qr.trim(),
  });

  const result = await service.validateCompetition({
    idcompany, idevent, accreditation, idsport,
  });

  res.json({ ok: true, ...result });
});

// GET /api/competition/validate-doc?doctype=1&docnumber=XXXXX&idsport=9
exports.validateByDocument = asyncHandler(async (req, res) => {
  const { doctype, docnumber, idsport } = req.query;
  const { idcompany, idevent } = req.user;
  if (!doctype || !docnumber) throw new AppError(400, "Debe enviar doctype y docnumber");
  if (!idsport)               throw new AppError(400, "Debe enviar el parámetro idsport");

  const accreditation = await service.findByDocument({
    idcompany, idevent, doctype, docnumber,
  });

  const result = await service.validateCompetition({
    idcompany, idevent, accreditation, idsport,
  });

  res.json({ ok: true, ...result });
});