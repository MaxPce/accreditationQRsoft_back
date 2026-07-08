// src/modules/events/events.routes.js
const { Router } = require("express");
const controller = require("./events.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();
router.get("/", requireAuth("company_logged"), controller.list);

module.exports = router;