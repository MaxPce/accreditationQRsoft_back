// src/modules/village/village.routes.js
const { Router } = require("express");
const controller = require("./village.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();
router.get("/lookup", requireAuth("event_selected"), controller.lookup);
router.post("/register", requireAuth("event_selected"), controller.registerEntry);

module.exports = router;