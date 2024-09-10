CREATE TABLE IF NOT EXISTS power_tool_params_power_tools(
   id INTEGER REFERENCES power_tools(id), 
   params INTEGER REFERENCES power_tool_params(id)
);