CREATE TABLE IF NOT EXISTS components(
   id SMALLINT PRIMARY KEY UNIQUE,
   title VARCHAR (50) UNIQUE NOT NULL,
   layer SMALLINT NOT NULL,
   system_id SMALLINT REFERENCES systems(id)
   -- system_id SMALLINT NOT NULL,
   -- CONSTRAINT fk_system FOREIGN KEY(system_id) REFERENCES system(id)
);