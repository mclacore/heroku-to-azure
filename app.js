const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");
var bodyParser = require("body-parser");

const services = require("./services/requests");

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static("build"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "client", "build")));

app.get("/api/activities", (req, res) => {
  // route root directory ('/' is this file (app.js))

  services.getAllActivities(req, res);
});

app.post("/api/activities", (req, res) => {
  services.addActivityToDB(req, res);
});

app.get("/api/activities/new", (req, res) => {
  services.getSingleActivity(req, res);
});

app.get("/api/activities/delete", (req, res) => {
  services.deleteAllActivites(req, res);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`App is running on ${PORT}`);
});
