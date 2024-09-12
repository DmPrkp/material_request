CREATE TABLE IF NOT EXISTS components_power_tools_consumption(
   id INTEGER PRIMARY KEY UNIQUE,
   component_id SMALLINT REFERENCES components(id),
   power_tools_id INTEGER REFERENCES power_tools(id),
   -- consumption REAL,
   consumption SMALLINT,
   user_id SERIAL REFERENCES users(id)
);