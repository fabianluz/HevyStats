CREATE TABLE workouts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    notes TEXT
);

CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE sets (
    id SERIAL PRIMARY KEY,
    workout_id INT REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
    set_order INT,
    weight_kg DECIMAL(6,2),
    reps INT,
    rpe DECIMAL(3,1),
    set_type VARCHAR(50),
    notes TEXT
);