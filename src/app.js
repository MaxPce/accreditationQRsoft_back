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

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/companies", companiesRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/accreditations", accreditationsRoutes);
app.use("/api/meals", mealsRoutes);
app.use("/api/village", villageRoutes);


app.use((req, res) => res.status(404).json({ ok: false, message: "Ruta no encontrada" }));
app.use(errorMiddleware);

module.exports = app;