CREATE TABLE IF NOT EXISTS hand_tools(
   id SERIAL PRIMARY KEY UNIQUE,
   title VARCHAR (50) UNIQUE NOT NULL,
   ru_title VARCHAR (50) UNIQUE NOT NULL
);

INSERT INTO hand_tools (id, title, ru_title) VALUES (1, 'tape measure', 'рулетка');
INSERT INTO hand_tools (id, title, ru_title) VALUES (2, 'level', 'уровень');
INSERT INTO hand_tools (id, title, ru_title) VALUES (3, 'hammer', 'молоток');
INSERT INTO hand_tools (id, title, ru_title) VALUES (4, 'handsaw', 'пила');
INSERT INTO hand_tools (id, title, ru_title) VALUES (5, 'metal shears', 'ножницы по металлу');
INSERT INTO hand_tools (id, title, ru_title) VALUES (6, 'box cutter', 'нож строительный');
INSERT INTO hand_tools (id, title, ru_title) VALUES (7, 'flat paint brush', 'малярная кисть');
INSERT INTO hand_tools (id, title, ru_title) VALUES (8, 'paint roller', 'валик малярный');
INSERT INTO hand_tools (id, title, ru_title) VALUES (9, 'trowel with teeth', 'гладилка зубчатая');  
INSERT INTO hand_tools (id, title, ru_title) VALUES (10, 'pail', 'ведро');
INSERT INTO hand_tools (id, title, ru_title) VALUES (11, 'putty knife', 'шпатель');
INSERT INTO hand_tools (id, title, ru_title) VALUES (12, 'plumb bob', 'отвес');
INSERT INTO hand_tools (id, title, ru_title) VALUES (13, 'carpenter square', 'угольник плотницкий');
INSERT INTO hand_tools (id, title, ru_title) VALUES (14, 'chalk line', 'шнурок мелованный');
INSERT INTO hand_tools (id, title, ru_title) VALUES (15, 'block plane', 'рубанок');
INSERT INTO hand_tools (id, title, ru_title) VALUES (16, 'nail puller', 'гвоздодёр');
INSERT INTO hand_tools (id, title, ru_title) VALUES (17, 'screwdriver', 'отвёртка');
INSERT INTO hand_tools (id, title, ru_title) VALUES (18, 'wire stripper', 'инструмент для снятия изоляции');
INSERT INTO hand_tools (id, title, ru_title) VALUES (19, 'tin snips', 'ножницы по жести');
INSERT INTO hand_tools (id, title, ru_title) VALUES (20, 'pruning shears', 'садовые ножницы');
INSERT INTO hand_tools (id, title, ru_title) VALUES (21, 'pipe cutter', 'труборез');
INSERT INTO hand_tools (id, title, ru_title) VALUES (22, 'masonry trowel', 'мастерок');
INSERT INTO hand_tools (id, title, ru_title) VALUES (23, 'hex key', 'шестигранный ключ');
INSERT INTO hand_tools (id, title, ru_title) VALUES (24, 'mallet', 'кувалда');