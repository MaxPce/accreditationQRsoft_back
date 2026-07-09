// src/server.js
const app = require("./app");
const { port } = require("./config/env");

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor ejecutándose en http://0.0.0.0:${port}`);
});