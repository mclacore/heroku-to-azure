const fetch = require("node-fetch");
const { Pool } = require("pg");
const { createClient } = require("redis");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

await client.hSet("user-session:123", {
  name: "John",
  surname: "Doe",
  company: "Massdriver",
  email: "john@massdriver.cloud",
});

let userSession = await client.hGetAll("user-session:123");
console.log(JSON.stringify(userSession, null, 2));

const getAllActivities = (req, res) => {
  const getString = "SELECT * FROM my_activities";
  const countString = "SELECT count(*) FROM my_activities";
  pool
    .query(getString)
    .then((activityResults) => {
      let activities = activityResults.rows;
      pool.query(countString).then((countResult) => {
        let count = countResult.rows[0].count;
        console.log("Activities List:", activities);
        console.log(`Activities Count: ${count}`);
        res.json({ activities, count });
        // res.render('index', { activities: activities, count: count }); // render index.ejs, and send activity and count results to index.ejs
        // TODO: Send info to frontend
      });
    })
    .catch((err) => console.log(err));
};

const getSingleActivity = (req, res) => {
  fetch("https://www.boredapi.com/api/activity")
    .then((data) => data.json())
    .then((json) => res.json(json))
    .catch((err) => console.log(err));
};

const addActivityToDB = (req, res) => {
  const activity = [req.body.activity];

  const addString =
    "INSERT INTO my_activities (activity) VALUES ($1) RETURNING *";

  pool
    .query(addString, activity)
    .then((result) => res.json(result))
    .catch((err) => console.log(err));
};

const deleteAllActivites = (req, res) => {
  const removeString = "DELETE FROM my_activities";
  pool
    .query(removeString)
    .then(res.send("All activities cleared!"))
    .catch((err) => console.log(err));
};

module.exports = {
  getSingleActivity,
  addActivityToDB,
  getAllActivities,
  deleteAllActivites,
};
