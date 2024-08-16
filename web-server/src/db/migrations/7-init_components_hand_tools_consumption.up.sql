CREATE TABLE IF NOT EXISTS components_hand_tools_consumption(
   component_id SMALLINT REFERENCES components(id),
   hand_tools_id INTEGER REFERENCES hand_tools(id),
   -- consumption REAL,
   consumption SMALLINT,
   user_id SERIAL PRIMARY KEY UNIQUE
);