BEGIN;

CREATE TABLE IF NOT EXISTS hand_tool_params(
   id SERIAL PRIMARY KEY UNIQUE,
   hand_tools_id INTEGER REFERENCES hand_tools(id), 
   parameter VARCHAR (50) NOT NULL,
   measure VARCHAR (20) NOT NULL
);

INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (1, 1, '1', 'm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (2, 1, '3', 'm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (3, 1, '5', 'm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (4, 1, '10', 'm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (5, 2, '20', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (6, 2, '40', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (7, 2, '50', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (8, 2, '60', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (9, 2, '80', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (10, 2, '100', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (11, 2, '120', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (12, 2, '150', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (13, 2, '180', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (14, 2, '200', 'cm');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (15, 3, '5', 'l');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (16, 3, '7', 'l');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (17, 3, '12', 'l');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (18, 3, '15', 'l');
INSERT INTO hand_tool_params (id, hand_tools_id, parameter, measure) VALUES (19, 3, '20', 'l');

COMMIT;