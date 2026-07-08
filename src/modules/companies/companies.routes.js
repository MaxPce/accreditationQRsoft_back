// src/modules/companies/companies.routes.js
const { Router } = require("express");
const controller = require("./companies.controller");

const router = Router();
router.get("/", controller.list);

module.exports = router;