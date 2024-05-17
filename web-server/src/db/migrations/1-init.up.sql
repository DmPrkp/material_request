CREATE TABLE IF NOT EXISTS work_type(
   id serial PRIMARY KEY,
   title VARCHAR (50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS system(
   id serial PRIMARY KEY,
   title VARCHAR (50) UNIQUE NOT NULL,
   description VARCHAR (200) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS component(
   id serial PRIMARY KEY,
   title VARCHAR (50) UNIQUE NOT NULL
);