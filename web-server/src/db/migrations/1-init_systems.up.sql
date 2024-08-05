BEGIN;
CREATE TABLE IF NOT EXISTS systems(
   id SMALLSERIAL PRIMARY KEY UNIQUE,
   title VARCHAR (50) UNIQUE NOT NULL,
   description VARCHAR (200)
);

INSERT INTO systems (id, title, description) VALUES (1, 'EIFS', 'Exterior insulation finishing systems');
INSERT INTO systems (id, title, description) VALUES (999, 'TEST', 'test system');

COMMIT;