
# HevyStats - Workout Analytics Dashboard 🏋️‍♂️

A full-stack data visualization platform that transforms raw export data from the **Hevy** workout app into an interactive analytics dashboard.

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📖 Overview

Fitness apps often lock advanced analytics behind paywalls. **HevyStats** solves this by providing a personal dashboard to visualize progress, track volume, and calculate estimated 1RM (One Rep Max) using your own data.

The system ingests "dirty," denormalized CSV logs, processes them via a custom **ETL pipeline**, and stores them in a normalized **PostgreSQL** database for efficient querying.

## ✨ Key Features

- **ETL Data Pipeline:** Parses raw CSV files (`stream` processing), filters duplicates, and normalizes data into Relational Tables.
- **Interactive Dashboard:** Visualizes estimated 1RM and Volume trends over time using **Chart.js** with gradient styling.
- **Smart Logbook:** Searchable history with date range filtering and accordion-style details (Set, Reps, RPE, Notes).
- **Data Integrity:** Uses SQL Transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) to ensure partial imports never corrupt the database.
- **Performance:** optimized SQL queries to handle aggregation on the database layer, not the application layer.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Raw SQL, 3NF Schema)
- **Frontend:** HTML5, Bootstrap 5, Chart.js, Vanilla JS
- **Tools:** Multer (File Handling), CSV-Parser

## 📸 Screenshots
<img width="3412" height="1682" alt="image" src="https://github.com/user-attachments/assets/16169b33-a5a9-435b-86aa-d886d323bf31" />

<img width="3404" height="1672" alt="image" src="https://github.com/user-attachments/assets/b80f02f3-0660-491a-8c05-41db39e362d8" />

<img width="3372" height="1698" alt="image" src="https://github.com/user-attachments/assets/2721cb4a-ee04-4194-b902-0d9c313f50ac" />




## 🗄️ Database Schema

The project transforms flat file data into a **3NF (Third Normal Form)** structure:

- **`workouts`**: Unique sessions (Date, Title, Notes).
- **`exercises`**: Dictionary of exercise names to prevent redundancy.
- **`sets`**: The transactional data linking workouts and exercises (Weight, Reps, RPE).

## 🚀 How to Run Locally

### Prerequisites

- Node.js installed
- PostgreSQL installed and running

### 1. Clone the Repo

```bash
git clone https://github.com/fabianluz/HevyStats.git
cd HevyStats
```


### 2. Install Dependencies

```bash
npm install

```

### 3. Database Setup

Create a PostgreSQL database named `hevy_clone` and run the script found in `database.sql`.

### 4. Configure Database

Update `db.js` with your local PostgreSQL credentials:

```javascript
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "hevy_clone",
  password: "YOUR_PASSWORD",
  port: 5432,
});
```

### 5. Run the Server

```bash
node server.js

```

Visit `http://localhost:3000` in your browser.

---

Developed by [Fabian Luz](https://github.com/fabianluz)
