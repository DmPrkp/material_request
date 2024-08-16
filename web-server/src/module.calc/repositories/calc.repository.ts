import { Inject, Injectable } from '@nestjs/common';

import { SystemType } from '~/types';
import { RawResult, CalcRequestDTO, CalcResponseDTO } from '../types';
import { Pool } from 'pg';
import { PGClientName } from '~/db/PostgresClient';

@Injectable()
export class CalcRepositories {
  constructor(@Inject(PGClientName) private readonly pgClient: Pool) {}

  async getComponents(
    systemTitle: SystemType['title'],
    calcRequestDTO: CalcRequestDTO,
  ) {
    console.log(`Get calc by ${systemTitle} system`);
    const { components, workerCrews } = calcRequestDTO;
    const componentIds = Object.keys(components).join(',');

    const query = `
      SELECT 
        components.id AS component_id, 
        components.title AS component_title,
        hand_tools.id AS hand_tool_id, 
        hand_tools.title AS hand_tool_title, 
        hand_tools.ru_title,
        hand_tool_params.id AS hand_tool_param_id, 
        hand_tool_params.parameter, 
        hand_tool_params.measure,
        components_hand_tools_consumption.consumption * ${workerCrews} AS adjusted_consumption

      FROM components_hand_tools_consumption

      LEFT JOIN components
        ON components_hand_tools_consumption.component_id = components.id

      LEFT JOIN hand_tools
        ON components_hand_tools_consumption.hand_tools_id = hand_tools.id

      LEFT JOIN hand_tool_params_hand_tools
          ON hand_tools.id = hand_tool_params_hand_tools.id

      LEFT JOIN hand_tool_params
          ON hand_tool_params_hand_tools.params = hand_tool_params.id

      WHERE components_hand_tools_consumption.component_id IN (${componentIds})
      ORDER BY components.layer ASC;
    `;

    const { rows } = await this.pgClient.query<RawResult>(query);

    const componentsMap = new Map();

    rows.forEach((row) => {
      const {
        component_id,
        component_title,
        hand_tool_id,
        hand_tool_title,
        ru_title,
        adjusted_consumption,
        hand_tool_param_id,
        parameter,
        measure,
      } = row;

      // Check if the component is already in the map, if not, add it
      if (!componentsMap.has(component_id)) {
        componentsMap.set(component_id, {
          id: component_id,
          title: component_title,
          hand_tools: [],
        });
      }

      const component = componentsMap.get(component_id);

      // Check if the hand tool is already in the component's hand_tools array, if not, add it
      let handTool = component.hand_tools.find((ht) => ht.id === hand_tool_id);

      if (!handTool) {
        handTool = {
          id: hand_tool_id,
          title: hand_tool_title,
          ru_title: ru_title,
          adjusted_consumption: adjusted_consumption,
          params: [], // Initialize an empty array for params
        };
        component.hand_tools.push(handTool);
      }

      // Add the parameter to the hand_tool's params array
      handTool.params.push({
        id: hand_tool_param_id,
        parameter,
        measure,
      });
    });
    return Array.from<CalcResponseDTO>(componentsMap.values());
  }
}
