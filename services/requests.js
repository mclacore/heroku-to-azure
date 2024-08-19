const fetch = require("node-fetch");
const { Pool } = require("pg");
const { createClient } = require("redis");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTables() {
  const tableDefinitions = [
    {
      tableName: "my_activities",
      query: `
        CREATE TABLE IF NOT EXISTS my_activities (
          id SERIAL PRIMARY KEY,
          activity TEXT NOT NULL
        );
      `,
    },
    {
      tableName: "my_goals",
      query: `
        CREATE TABLE IF NOT EXISTS my_goals (
          id SERIAL PRIMARY KEY,
          goal TEXT NOT NULL
        );
      `,
    },
    {
      tableName: "my_hobbies",
      query: `
        CREATE TABLE IF NOT EXISTS my_hobbies (
          id SERIAL PRIMARY KEY,
          hobby TEXT NOT NULL
        );
      `,
    },
  ];

  try {
    for (const tableDef of tableDefinitions) {
      await pool.query(tableDef.query);
      console.log(`Table created or verified: ${tableDef.tableName}`);
    }
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

createTables().then(() => {
  console.log("All tables created or verified successfully.");
});

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => console.log("Redis Client Error", err));

(async () => {
  try {
    await client.connect();
    console.log("Connected to Redis");

    await client.set("foo", "bar");
    console.log("Set foo to bar");

    const value = await client.get("foo");
    console.log("Value of foo:", value);
  } catch (err) {
    console.error("Error connecting to Redis", err);
  } finally {
    await client.quit();
  }
})();

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
  fetch("https://bored-api.appbrewery.com/random")
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
