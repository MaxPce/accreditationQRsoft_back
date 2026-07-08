// src/modules/companies/companies.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./companies.service");

exports.list = asyncHandler(async (req, res) => {
  const companies = await service.listCompanies();
  res.json({ ok: true, companies });
});