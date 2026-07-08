// src/modules/auth/auth.routes.js
const { Router } = require("express");
const controller = require("./auth.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();

router.post("/login", controller.login);
router.post("/select-event", requireAuth("company_logged"), controller.selectEvent);
router.get("/me", requireAuth(), controller.me);

module.exports = router;