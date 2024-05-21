CREATE TABLE IF NOT EXISTS component(
   id SERIAL PRIMARY KEY UNIQUE,
   title VARCHAR (50) UNIQUE NOT NULL,
   layer SMALLINT NOT NULL,
   system_id SMALLSERIAL REFERENCES system(id)
   -- system_id SMALLINT NOT NULL,
   -- CONSTRAINT fk_system FOREIGN KEY(system_id) REFERENCES system(id)
);

INSERT INTO component (id, title, SYSTEM_ID, LAYER) VALUES (1, 'base coat adhesive', 1, 1);
INSERT INTO component (id, title, SYSTEM_ID, LAYER) VALUES (2, 'insulation', 1, 2);
INSERT INTO component (id, title, SYSTEM_ID, LAYER) VALUES (3, 'fiberglass mesh', 1, 3);
INSERT INTO component (id, title, SYSTEM_ID, LAYER) VALUES (4, 'finish coat', 1, 4);
INSERT INTO component (id, title, SYSTEM_ID, LAYER) VALUES (5, 'paint layer', 1, 5);