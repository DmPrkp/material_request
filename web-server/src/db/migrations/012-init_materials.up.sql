CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    ru_title VARCHAR(100) NOT NULL,
    description TEXT,
    ru_description TEXT
);