// src/modules/accreditations/accreditations.routes.js
const { Router } = require("express");
const controller = require("./accreditations.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();
router.get("/lookup/qr", requireAuth("event_selected"), controller.lookupByQr);
router.get("/lookup/document", requireAuth("event_selected"), controller.lookupByDocument);

module.exports = router;