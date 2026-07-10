// src/modules/competition/competition.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const AppError     = require("../../utils/AppError");
const service      = require("./competition.service");

// GET /api/competition/sports
exports.listSports = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const sports = await service.listSports({ idcompany, idevent });
  res.json({ ok: true, sports });
});

// GET /api/competition/validate?qr=XXXXX&idsport=9&idsport_param=2PB0016
exports.validateByQr = asyncHandler(async (req, res) => {
  const { qr, idsport, idsport_param } = req.query;  
  const { idcompany, idevent, idaccount } = req.user;
  if (!qr)      throw new AppError(400, "Debe enviar el parámetro qr");
  if (!idsport) throw new AppError(400, "Debe enviar el parámetro idsport");

  const accreditation = await service.findByDocnumber({ idcompany, idevent, docnumber: qr.trim() });
  const result = await service.validateCompetition({
    idcompany, idevent, accreditation, idsport,
    idsport_param: idsport_param || null,   
  });

  if (result.authorized) {
    await service.registerEntry({
      idcompany, idevent,
      idacreditation: accreditation.idacreditation,
      idsport,
      idtest: idsport_param || null,  
      idaccount,
    });
  }


  res.json({ ok: true, ...result });
});

// GET /api/competition/validate-doc?doctype=1&docnumber=XXXXX&idsport=9&idsport_param=2PB0016
exports.validateByDocument = asyncHandler(async (req, res) => {
  const { doctype, docnumber, idsport, idsport_param } = req.query;  
  const { idcompany, idevent, idaccount } = req.user;
  if (!doctype || !docnumber) throw new AppError(400, "Debe enviar doctype y docnumber");
  if (!idsport)               throw new AppError(400, "Debe enviar el parámetro idsport");

  const accreditation = await service.findByDocument({ idcompany, idevent, doctype, docnumber });
  const result = await service.validateCompetition({
    idcompany, idevent, accreditation, idsport,
    idsport_param: idsport_param || null,   // <-- pasar opcionalmente
  });

  if (result.authorized) {
    await service.registerEntry({
      idcompany, idevent,
      idacreditation: accreditation.idacreditation,
      idsport,
      idtest: idsport_param || null,
      idaccount,
    });
  }

  res.json({ ok: true, ...result });
});

// GET /api/competition/tests?idsport=9
exports.listTests = asyncHandler(async (req, res) => {
  const { idsport } = req.query;
  const { idcompany, idevent } = req.user;
  if (!idsport) throw new AppError(400, "Debe enviar el parámetro idsport");

  const tests = await service.listTestsBySport({ idcompany, idevent, idsport });
  res.json({ ok: true, tests });
});

// GET /api/competition/history?idsport=9&idtest=&docnumber=&limit=100
exports.getHistory = asyncHandler(async (req, res) => {
  const { idsport, idtest, docnumber, limit } = req.query; 
  const { idcompany, idevent } = req.user;

  const records = await service.getHistory({
    idcompany, idevent,
    docnumber: docnumber || null,
    idsport:   idsport   || null,
    idtest:    idtest    || null,          
    limit:     limit ? Number(limit) : 100,
  });

  res.json({ ok: true, records });
});
