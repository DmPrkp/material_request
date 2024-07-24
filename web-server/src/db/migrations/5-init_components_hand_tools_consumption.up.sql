CREATE TABLE IF NOT EXISTS components_hand_tools_consumption(
   component_id SMALLSERIAL REFERENCES components(id),
   hand_tools_id SMALLSERIAL REFERENCES hand_tools(id),
   hand_tool_params SMALLSERIAL REFERENCES hand_tool_params(id),
   consumption REAL,
   user SERIAL PRIMARY KEY UNIQUE
)

INSERT INTO components_hand_tools_consumption (component_id, hand_tools_id, hand_tool_params, consumption, user) VALUES (1, 10);