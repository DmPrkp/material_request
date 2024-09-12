CREATE TABLE IF NOT EXISTS hand_tool_params_hand_tools(
   id INTEGER REFERENCES components_hand_tools_consumption(id), 
   params INTEGER REFERENCES hand_tool_params(id)
);