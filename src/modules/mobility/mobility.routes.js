const { Router } = require("express");
const controller = require("./mobility.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();
router.get("/lookup", requireAuth("event_selected"), controller.lookup);
router.post("/register", requireAuth("event_selected"), controller.registerLog);
router.get("/history", requireAuth("event_selected"), controller.getHistory);


module.exports = router;