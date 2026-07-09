// src/modules/meals/meals.routes.js
const { Router } = require("express");
const controller = require("./meals.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();
router.get("/lookup", requireAuth("event_selected"), controller.lookup);
router.post("/check", requireAuth("event_selected"), controller.check);
router.get("/history", requireAuth("event_selected"), controller.history);

module.exports = router;