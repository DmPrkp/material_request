CREATE TABLE IF NOT EXISTS hand_tool_params_hand_tools(
   id INTEGER REFERENCES hand_tools(id), 
   params INTEGER REFERENCES hand_tool_params(id)
);