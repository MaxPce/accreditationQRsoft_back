// src/modules/competition/competition.routes.js
const { Router }      = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const ctrl            = require("./competition.controller");

const router = Router();

router.get("/sports",       requireAuth("event_selected"), ctrl.listSports);
router.get("/validate",     requireAuth("event_selected"), ctrl.validateByQr);
router.get("/validate-doc", requireAuth("event_selected"), ctrl.validateByDocument);

module.exports = router;