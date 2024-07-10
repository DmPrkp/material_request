CREATE TABLE IF NOT EXISTS hand_tools_components(
   component_id SMALLSERIAL REFERENCES components(id)
   hand_tools_id SMALLSERIAL REFERENCES hand_tools(id)
)

INSERT INTO hand_tools_components (component_id, hand_tools_id) VALUES (1, 1);