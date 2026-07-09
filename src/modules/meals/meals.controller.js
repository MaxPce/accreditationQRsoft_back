// src/modules/meals/meals.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const accreditations = require("../accreditations/accreditations.service");
const service = require("./meals.service");

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
    if (!doctype || !docnumber) throw new AppError(400, "doctype y docnumber son requeridos");
    accreditation = await accreditations.findByDocument({
      idcompany,
      idevent,
      doctype,
      docnumber,
    });
  }

  const mealsToday = await service.getTodayStatus({
    idcompany,
    idevent,
    idacreditation: accreditation.idacreditation,
  });

  res.json({ ok: true, accreditation, mealsToday });
});

exports.check = asyncHandler(async (req, res) => {
  const { idacreditation, mealType } = req.body;
  const { idcompany, idevent, idaccount } = req.user;

  if (!idacreditation || !mealType) {
    throw new AppError(400, "idacreditation y mealType son requeridos");
  }

  const result = await service.checkMeal({
    idcompany,
    idevent,
    idacreditation,
    mealType,
    idaccount,
  });

  res.json({ ok: true, ...result });
});

exports.history = asyncHandler(async (req, res) => {
  const { docnumber, meal_type, date } = req.query;
  const { idcompany, idevent } = req.user;

  const records = await service.getHistory({
    idcompany,
    idevent,
    docnumber: docnumber || null,
    meal_type: meal_type || null,
    date:      date      || null,
  });
  res.json({ ok: true, records });
});
