// src/modules/village/village.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const accreditations = require("../accreditations/accreditations.service");
const service = require("./village.service");

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

  const entriesToday = await service.getEntriesToday({
    idcompany,
    idevent,
    idacreditation: accreditation.idacreditation,
  });

  res.json({ ok: true, accreditation, entriesToday });
});

exports.registerEntry = asyncHandler(async (req, res) => {
  const { idacreditation, gate } = req.body;
  const { idcompany, idevent, idaccount } = req.user;

  const result = await service.registerEntry({
    idcompany,
    idevent,
    idacreditation,
    gate,
    idaccount,
  });

  res.json({ ok: true, ...result });
});