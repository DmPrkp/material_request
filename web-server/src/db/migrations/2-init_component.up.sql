CREATE TABLE IF NOT EXISTS component(
   id SMALLSERIAL PRIMARY KEY,
   title VARCHAR (50) UNIQUE NOT NULL,
   layer SMALLINT NOT NULL,
   system_id SMALLINT NOT NULL,
   -- system_id SMALLINT REFERENCES system (id),
   CONSTRAINT fk_system FOREIGN KEY(system_id) REFERENCES system(id)
);

INSERT INTO component (title, SYSTEM_ID, LAYER) VALUES ('base coat adhesive', 1, 1);
INSERT INTO component (title, SYSTEM_ID, LAYER) VALUES ('insulation', 1, 2);
INSERT INTO component (title, SYSTEM_ID, LAYER) VALUES ('fiberglass mesh', 1, 3);
INSERT INTO component (title, SYSTEM_ID, LAYER) VALUES ('finish coat', 1, 4);
INSERT INTO component (title, SYSTEM_ID, LAYER) VALUES ('paint layer', 1, 5);