// src/modules/village/village.routes.js 
const { Router }      = require("express");
const controller      = require("./village.controller");
const { requireAuth } = require("../../middlewares/auth.middleware");

const router = Router();

router.get("/lookup",                                        requireAuth("event_selected"), controller.lookup);
router.post("/register",                                     requireAuth("event_selected"), controller.registerEntry);
router.get("/buildings",                                     requireAuth("event_selected"), controller.listBuildings);
router.get("/buildings/:idbuilding/countries",               requireAuth("event_selected"), controller.getBuildingCountries);
router.post("/buildings/:idbuilding/countries",              requireAuth("event_selected"), controller.assignCountry);
router.delete("/buildings/:idbuilding/countries/:idcountry", requireAuth("event_selected"), controller.removeCountry);
router.get("/countries",                                     requireAuth("event_selected"), controller.listAllCountries);

module.exports = router;