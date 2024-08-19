const fetch = require("node-fetch");
const { Pool } = require("pg");
const { createClient } = require("redis");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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

async function startCache() {
  const client = createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  console.log("Connected to Redis");

  console.log("\nCache command: PING");
  console.log("Cache response : " + (await client.ping()));

  console.log("\nCache command: GET Message");
  console.log("Cache response : " + (await client.get("message")));

  console.log("\nCache command: SET Message");
  console.log(
    "Cache response : " + (await client.set("message", "Hello World")),
  );

  console.log("\nCache command: GET Message");
  console.log("Cache response : " + (await client.get("message")));

  console.log("\nCache command: CLIENT LIST");
  console.log(
    "Cache response : " + (await client.sendCommand(["CLIENT", "LIST"])),
  );

  client.disconnect();

  return "Done";
}

startCache()
  .then((result) => console.log(result))
  .catch((ex) => console.error(ex));

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
  const primaryUrl = "https://bored-api.appbrewery.com/activity";
  const fallbackUrl = "https://bored.api.lewagon.com/api/activity";

  fetch(primaryUrl)
    .then((response) => {
      if (!response.ok)
        throw new Error(`API responded with status ${response.status}`);
      return response.json();
    })
    .then((json) => {
      res.json(json);
    })
    .catch((error) => {
      console.log(
        `Failed to fetch from primary URL due to: ${error.message}. Trying fallback URL.`,
      );
      fetch(fallbackUrl)
        .then((response) => {
          if (!response.ok)
            throw new Error(
              `Fallback API responded with status ${response.status}`,
            );
          return response.json();
        })
        .then((json) => {
          res.json(json);
        })
        .catch((fallbackError) => {
          console.error("Failed to fetch from fallback URL:", fallbackError);
          res.status(500).json({
            error:
              "Failed to fetch activity from both primary and fallback sources",
          });
        });
    });
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
