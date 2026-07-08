// src/modules/auth/auth.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const authService = require("./auth.service");

exports.login = asyncHandler(async (req, res) => {
  const { idcompany, username, password } = req.body;
  const result = await authService.login({ idcompany, username, password });
  res.json({ ok: true, ...result });
});

exports.selectEvent = asyncHandler(async (req, res) => {
  const { idevent } = req.body;
  const result = await authService.selectEvent({ ...req.user, idevent });
  res.json({ ok: true, ...result });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ ok: true, user: req.user });
});