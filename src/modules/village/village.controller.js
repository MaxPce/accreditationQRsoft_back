// src/modules/village/village.controller.js 
const asyncHandler   = require("../../utils/asyncHandler");
const AppError       = require("../../utils/AppError");
const accreditations = require("../accreditations/accreditations.service");
const service        = require("./village.service");

// GET /api/village/lookup?qr=xxx  |  ?doctype=1&docnumber=xxx
exports.lookup = asyncHandler(async (req, res) => {
  const { qr, doctype, docnumber } = req.query;
  const { idcompany, idevent } = req.user;

  const accreditation = qr
    ? await accreditations.findByDocnumber({ idcompany, idevent, docnumber: qr.trim() })
    : await accreditations.findByDocument({ idcompany, idevent, doctype, docnumber });

  const entriesToday = await service.getEntriesToday({
    idcompany, idevent, idacreditation: accreditation.idacreditation,
  });

  res.json({ ok: true, accreditation, entriesToday });
});

// POST /api/village/register  body: { idacreditation, gate, idbuilding? }
exports.registerEntry = asyncHandler(async (req, res) => {
  const { idacreditation, gate, idbuilding } = req.body;
  const { idcompany, idevent, idaccount } = req.user;

  // Si viene idbuilding, validar que el país del atleta esté asignado al edificio
  if (idbuilding) {
    const country = await service.getAccreditationCountry({ idcompany, idevent, idacreditation });
    const allowed = await service.validateBuildingAccess({
      idcompany, idevent, idbuilding, idcountry: country,
    });
    if (!allowed) {
      throw new AppError(403, "El país del atleta no está asignado a este edificio");
    }
  }

  const result = await service.registerEntry({
    idcompany, idevent, idacreditation, gate,
    idbuilding: idbuilding ?? null,
    idaccount,
  });

  res.json({ ok: true, ...result });
});

// GET /api/village/buildings
exports.listBuildings = asyncHandler(async (req, res) => {
  const { idcompany } = req.user;
  const buildings = await service.listBuildings({ idcompany });
  res.json({ ok: true, buildings });
});

// GET /api/village/buildings/:idbuilding/countries
exports.getBuildingCountries = asyncHandler(async (req, res) => {
  const { idbuilding } = req.params;
  const { idcompany, idevent } = req.user;
  const countries = await service.getBuildingCountries({ idcompany, idevent, idbuilding });
  res.json({ ok: true, countries });
});

// POST /api/village/buildings/:idbuilding/countries  body: { idcountry }
exports.assignCountry = asyncHandler(async (req, res) => {
  const { idbuilding } = req.params;
  const { idcountry }  = req.body;
  const { idcompany, idevent, idaccount } = req.user;
  if (!idcountry) throw new AppError(400, "Debe enviar idcountry");
  await service.assignCountryToBuilding({ idcompany, idevent, idbuilding, idcountry, idaccount });
  res.json({ ok: true, message: "País asignado al edificio" });
});

// DELETE /api/village/buildings/:idbuilding/countries/:idcountry
exports.removeCountry = asyncHandler(async (req, res) => {
  const { idbuilding, idcountry } = req.params;
  const { idcompany, idevent }    = req.user;
  await service.removeCountryFromBuilding({ idcompany, idevent, idbuilding, idcountry });
  res.json({ ok: true, message: "País removido del edificio" });
});

// GET /api/village/countries
exports.listAllCountries = asyncHandler(async (req, res) => {
  const countries = await service.listAllCountries(); 
  res.json({ ok: true, countries });
});
