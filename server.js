const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const pool = require("./db");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// ==========================================
// 1. IMPORT ROUTE (Unchanged)
// ==========================================
app.post("/upload", upload.single("csvFile"), async (req, res) => {
  // ... (Keep the exact same import logic as before) ...
  if (!req.file) return res.status(400).send("No file uploaded.");

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const row of results) {
          const workoutDate = new Date(row["start_time"]);
          const workoutTitle = row["title"];
          const notes = row["description"] || "";

          let workoutId;
          const wCheck = await client.query(
            "SELECT id FROM workouts WHERE start_time = $1",
            [workoutDate],
          );
          if (wCheck.rows.length > 0) workoutId = wCheck.rows[0].id;
          else {
            const nw = await client.query(
              "INSERT INTO workouts (title, start_time, notes) VALUES ($1, $2, $3) RETURNING id",
              [workoutTitle, workoutDate, notes],
            );
            workoutId = nw.rows[0].id;
          }

          const exName = row["exercise_title"];
          let exId;
          const exCheck = await client.query(
            "SELECT id FROM exercises WHERE title = $1",
            [exName],
          );
          if (exCheck.rows.length > 0) exId = exCheck.rows[0].id;
          else {
            const ne = await client.query(
              "INSERT INTO exercises (title) VALUES ($1) RETURNING id",
              [exName],
            );
            exId = ne.rows[0].id;
          }

          const weight = parseFloat(row["weight_kg"]) || 0;
          const reps = parseInt(row["reps"]) || 0;
          const rpe = row["rpe"] ? parseFloat(row["rpe"]) : null;
          const setOrder = parseInt(row["set_index"]) || 0;
          const setType = row["set_type"] || "normal";
          const setNotes = row["exercise_notes"] || "";

          await client.query(
            `INSERT INTO sets (workout_id, exercise_id, set_order, weight_kg, reps, rpe, set_type, notes) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [workoutId, exId, setOrder, weight, reps, rpe, setType, setNotes],
          );
        }
        await client.query("COMMIT");
        res.send(`Import Success: ${results.length} sets processed.`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).send("Import Failed");
      } finally {
        client.release();
        fs.unlinkSync(req.file.path);
      }
    });
});

// ==========================================
// 2. DASHBOARD & STATS (Updated)
// ==========================================

// Global Stats Cards (Updated for Avg Workouts/Week)
app.get("/api/stats", async (req, res) => {
  try {
    const totalWorkouts = await pool.query("SELECT COUNT(*) FROM workouts");
    const heaviestLift = await pool.query("SELECT MAX(weight_kg) FROM sets");

    // Calculate Average Workouts per Week
    // Logic: Total Workouts / ((Last Date - First Date) in weeks)
    const dates = await pool.query(
      "SELECT MIN(start_time) as first, MAX(start_time) as last FROM workouts",
    );

    let avgPerWeek = 0;
    if (dates.rows[0].first && dates.rows[0].last) {
      const first = new Date(dates.rows[0].first);
      const last = new Date(dates.rows[0].last);
      const diffTime = Math.abs(last - first);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = diffDays / 7;

      // If less than 1 week of history, just show total workouts
      avgPerWeek =
        diffWeeks < 1
          ? totalWorkouts.rows[0].count
          : totalWorkouts.rows[0].count / diffWeeks;
    }

    res.json({
      workouts: totalWorkouts.rows[0].count,
      avgPerWeek: avgPerWeek.toFixed(1), // Round to 1 decimal
      heaviest: heaviestLift.rows[0].max,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/recent", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, start_time, notes FROM workouts ORDER BY start_time DESC LIMIT 5",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// History List (Updated for SEARCH FILTERING)
app.get("/api/history", async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;

    let query = "SELECT id, title, start_time, notes FROM workouts WHERE 1=1";
    let params = [];
    let counter = 1;

    if (search) {
      query += ` AND (title ILIKE $${counter} OR notes ILIKE $${counter})`;
      params.push(`%${search}%`);
      counter++;
    }

    if (startDate) {
      query += ` AND start_time >= $${counter}`;
      params.push(startDate);
      counter++;
    }

    if (endDate) {
      query += ` AND start_time <= $${counter}`;
      params.push(endDate);
      counter++;
    }

    query += " ORDER BY start_time DESC LIMIT 100"; // Limit to 100 for performance

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/api/history/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
            SELECT s.*, e.title as exercise_name 
            FROM sets s 
            JOIN exercises e ON s.exercise_id = e.id 
            WHERE s.workout_id = $1 
            ORDER BY s.id ASC
        `;
    const result = await pool.query(query, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ==========================================
// 3. ANALYTICS (Unchanged)
// ==========================================
app.get("/exercises", async (req, res) => {
  const result = await pool.query("SELECT * FROM exercises ORDER BY title ASC");
  res.json(result.rows);
});

app.get("/analytics/:exerciseId", async (req, res) => {
  const { exerciseId } = req.params;
  const query = `
        SELECT w.start_time, MAX(s.weight_kg) as max_weight, SUM(s.weight_kg * s.reps) as total_volume
        FROM sets s JOIN workouts w ON s.workout_id = w.id
        WHERE s.exercise_id = $1 AND s.set_type = 'normal'
        GROUP BY w.start_time ORDER BY w.start_time ASC;
    `;
  const result = await pool.query(query, [exerciseId]);

  const labels = result.rows.map((r) =>
    new Date(r.start_time).toLocaleDateString(),
  );
  const weightData = result.rows.map((r) => r.max_weight);
  const volumeData = result.rows.map((r) => r.total_volume);

  res.json({ labels, weightData, volumeData });
});

app.listen(3000, () => console.log("Server running on 3000"));
