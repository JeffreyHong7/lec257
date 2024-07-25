import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "Jalapeno.70",
  port: 5432,
});
db.connect();
let currentUserID = 1;

// define middleware/route handling
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function users() {
  try {
    let result = await db.query("SELECT * FROM users");
    if (!result.rows.length) {
      await db.query("INSERT INTO users VALUES (1, $1, $2)", ["Jeff", "teal"]);
      result = await db.query("SELECT * FROM users");
    }
    return result.rows;
  } catch (err) {
    console.error(err);
  }
}

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1",
    [currentUserID]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const userList = await users();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: userList,
    color: userList.find((user) => {
      return user.id === currentUserID;
    }).color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserID]
      );
      res.redirect("/");
    } catch (err) {
      console.error(err);
    }
  } catch (err) {
    console.error(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.user) {
    currentUserID = parseInt(req.body.user);
    res.redirect("/");
  } else {
    res.render("new.ejs");
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *",
      [
        req.body.name ? req.body.name : "Unnamed",
        req.body.color ? req.body.color : "teal",
      ]
    );
    currentUserID = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.error(err);
  }
});

// listen on port
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
