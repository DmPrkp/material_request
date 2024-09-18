CREATE TABLE IF NOT EXISTS components_materials_consumption(
   id SERIAL,
   component_id SMALLINT REFERENCES components(id),
   materials_id INTEGER REFERENCES materials(id),
   consumption REAL,
   user_id SERIAL REFERENCES users(id)
);