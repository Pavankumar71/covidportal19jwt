const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//GET states API
app.get("/states", authenticateToken, async (request, response) => {
  const getStatesQuery = `SELECT state_id AS stateId,state_name AS stateName,population FROM state`;
  const dbResponse = await db.all(getStatesQuery);
  console.log(dbResponse);
  response.send(dbResponse);
});

//GET state based on Id
app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStatesQuery = `SELECT state_id AS stateId,state_name AS stateName,population FROM state WHERE state_id=${stateId}`;
  const dbResponse = await db.get(getStatesQuery);
  console.log(dbResponse);
  response.send(dbResponse);
});

// ADD new district API

app.post("/districts", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  const dbResponse = await db.run(addQuery);
  response.send("District Successfully Added");
});

// Get district based on Id

app.get(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getStatesQuery = `SELECT district_id AS districtId,district_name AS districtName, state_id AS stateId, cases,cured,active,deaths FROM district WHERE district_id=${districtId}`;
    const dbResponse = await db.get(getStatesQuery);
    console.log(dbResponse);
    response.send(dbResponse);
  }
);

// delete API
app.delete(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteQuery = `DELETE FROM district WHERE district_id=${districtId}`;
    const dbResponse = await db.run(deleteQuery);
    response.send("District Removed");
  }
);

// update API

app.put(
  "/districts/:districtId",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateQuery = `UPDATE district 
    SET 
   district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured}, active=${active},deaths=${deaths} WHERE district_id=${districtId}`;
    const dbResponse = await db.run(updateQuery);
    response.send("District Details Updated");
  }
);

//GET API
app.get(
  "/states/:stateId/stats",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStateQuery = `SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured, SUM(active) AS totalActive, SUM(deaths) AS totalDeaths FROM district WHERE state_id=${stateId}`;
    const dbResponse = await db.get(getStateQuery);
    console.log(dbResponse);
    response.send(dbResponse);
  }
);

module.exports = app;
