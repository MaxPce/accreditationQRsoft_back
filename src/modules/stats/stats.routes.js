// src/modules/stats/stats.routes.js
const { Router } = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const ctrl = require("./stats.controller");

const router = Router();

// Comedor
router.get("/meals/by-date",  requireAuth("event_selected"), ctrl.mealsByDate);
router.get("/meals/by-range", requireAuth("event_selected"), ctrl.mealsByRange);
router.get("/meals/by-role",  requireAuth("event_selected"), ctrl.mealsByRole);

// Módulos (movilidad)
router.get("/modules/by-date",  requireAuth("event_selected"), ctrl.modulesByDate);
router.get("/modules/by-range", requireAuth("event_selected"), ctrl.modulesByRange);


router.get("/villa/by-date",  requireAuth("event_selected"), ctrl.villaByDate);  
router.get("/villa/by-range", requireAuth("event_selected"), ctrl.villaByRange);  
// Resumen diario consolidado
router.get("/summary", requireAuth("event_selected"), ctrl.dailySummary);

module.exports = router;