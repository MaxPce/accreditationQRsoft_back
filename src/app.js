// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./modules/auth/auth.routes");
const companiesRoutes = require("./modules/companies/companies.routes");
const eventsRoutes = require("./modules/events/events.routes");
const errorMiddleware = require("./middlewares/error.middleware");
const accreditationsRoutes = require("./modules/accreditations/accreditations.routes");
const mealsRoutes = require("./modules/meals/meals.routes");
const villageRoutes = require("./modules/village/village.routes");
const mobilityRoutes = require("./modules/mobility/mobility.routes");
const competitionRoutes = require("./modules/competition/competition.routes");
const statsRoutes = require("./modules/stats/stats.routes");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false, 
}));

app.use(cors({
  origin: true,        
  credentials: true,   
}));

app.use(morgan("dev"));
app.use(express.json());

app.use("/api/companies", companiesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/accreditations", accreditationsRoutes);
app.use("/api/meals", mealsRoutes);
app.use("/api/village", villageRoutes);
app.use("/api/mobility", mobilityRoutes);
app.use("/api/competition", competitionRoutes);
app.use("/api/stats", statsRoutes);


app.use((req, res) => res.status(404).json({ ok: false, message: "Ruta no encontrada v2" }));
app.use(errorMiddleware);

module.exports = app;