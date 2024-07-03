CREATE TABLE IF NOT EXISTS components(
   id SERIAL PRIMARY KEY UNIQUE,
   title VARCHAR (50) UNIQUE NOT NULL,
   layer SMALLINT NOT NULL,
   system_id SMALLSERIAL REFERENCES systems(id)
   -- system_id SMALLINT NOT NULL,
   -- CONSTRAINT fk_system FOREIGN KEY(system_id) REFERENCES system(id)
);

INSERT INTO components (id, title, system_id, layer) VALUES (1, 'base adhesive coat', 1, 1);
INSERT INTO components (id, title, system_id, layer) VALUES (2, 'insulation', 1, 2);
INSERT INTO components (id, title, system_id, layer) VALUES (3, 'fiberglass mesh', 1, 3);
INSERT INTO components (id, title, system_id, layer) VALUES (4, 'finish coat', 1, 4);
INSERT INTO components (id, title, system_id, layer) VALUES (5, 'paint layer', 1, 5);
INSERT INTO components (id, title, system_id, layer) VALUES (6, 'test layer', 999, 1);