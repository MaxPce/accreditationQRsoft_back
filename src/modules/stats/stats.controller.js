// src/modules/stats/stats.controller.js
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./stats.service");

exports.mealsByDate = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { date } = req.query;
  const data = await service.getMealStatsByDate({ idcompany, idevent, date });
  res.json({ ok: true, ...data });
});

exports.mealsByRange = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { days } = req.query;
  const data = await service.getMealStatsByRange({ idcompany, idevent, days: Number(days) || 7 });
  res.json({ ok: true, data });
});

exports.mealsByRole = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { date } = req.query;
  const data = await service.getMealStatsByRole({ idcompany, idevent, date });
  res.json({ ok: true, data });
});

exports.modulesByDate = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { date } = req.query;
  const result = await service.getModuleStatsByDate({ idcompany, idevent, date });
  res.json({ ok: true, ...result });
});

exports.modulesByRange = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { days } = req.query;
  const data = await service.getModuleStatsByRange({ idcompany, idevent, days: Number(days) || 7 });
  res.json({ ok: true, data });
});

exports.dailySummary = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { date } = req.query;
  const data = await service.getDailySummary({ idcompany, idevent, date });
  res.json({ ok: true, ...data });
});

exports.villaByDate = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { date } = req.query;
  const data = await service.getVillaStatsByDate({ idcompany, idevent, date });
  res.json({ ok: true, ...data });
});

exports.villaByRange = asyncHandler(async (req, res) => {
  const { idcompany, idevent } = req.user;
  const { days } = req.query;
  const data = await service.getVillaStatsByRange({ idcompany, idevent, days: Number(days) || 7 });
  res.json({ ok: true, data });
});