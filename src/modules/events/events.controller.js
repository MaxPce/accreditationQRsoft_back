// src/modules/events/events.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./events.service");

exports.list = asyncHandler(async (req, res) => {
  const events = await service.listEventsByCompany(req.user.idcompany);
  res.json({ ok: true, events });
});