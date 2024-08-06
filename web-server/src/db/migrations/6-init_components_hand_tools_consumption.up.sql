BEGIN;

CREATE TABLE IF NOT EXISTS components_hand_tools_consumption(
   component_id SMALLSERIAL REFERENCES components(id),
   hand_tools_id SERIAL REFERENCES hand_tools(id),
   hand_tool_params_id SERIAL REFERENCES hand_tool_params(id),
   -- consumption REAL,
   consumption SMALLINT,
   user_id SERIAL PRIMARY KEY UNIQUE
);

INSERT INTO components_hand_tools_consumption VALUES (1, 3, 17, 3, 1);

COMMIT;