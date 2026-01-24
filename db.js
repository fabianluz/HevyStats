// db.js
const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "hevy_clone",
  password: "YOUR_PASSWORD", // <--- REPLACE WITH YOU DATABASE PASSWORD
  port: 5432,
});

module.exports = pool;
