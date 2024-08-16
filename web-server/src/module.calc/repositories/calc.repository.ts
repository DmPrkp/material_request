import { Injectable } from '@nestjs/common';
import { PostgresClient } from '~/db/PostgresClient';

import { SystemType } from '~/types';
import { RawResult, CalcRequestDTO, CalcResponseDTO } from '../types';

@Injectable()
export class CalcRepositories {
  constructor(private readonly postgresClient: PostgresClient) {}

  async getComponents(
    systemTitle: SystemType['title'],
    calcRequestDTO: CalcRequestDTO,
  ) {
    console.log(`Get calc by ${systemTitle} system`);
    const { components, workerCrews } = calcRequestDTO;

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

      LEFT JOIN hand_tool_params
      ON components_hand_tools_consumption.hand_tool_params_id = hand_tool_params.id

      WHERE components_hand_tools_consumption.component_id IN 
        (${Object.keys(components).join(',')})
      ORDER BY components.layer ASC;
    `;

    const rawResults = await this.postgresClient.query<RawResult>(query);

    const componentsMap = new Map();

    rawResults.forEach((row) => {
      const componentId = row.component_id;

      if (!componentsMap.has(componentId)) {
        componentsMap.set(componentId, {
          id: componentId,
          title: row.component_title,
          hand_tools: [],
        });
      }

      const component = componentsMap.get(componentId);

      // Find the hand tool in the component's hand_tools array or add it if it doesn't exist
      let handTool = component.hand_tools.find(
        (ht) => ht.id === row.hand_tool_id,
      );

      if (!handTool) {
        handTool = {
          id: row.hand_tool_id,
          title: row.hand_tool_title,
          ru_title: row.ru_title,
          adjusted_consumption: row.adjusted_consumption,
          param: {
            parameter: row.parameter,
            measure: row.measure,
          },
        };
        component.hand_tools.push(handTool);
      } else {
        // If the hand tool already exists, just add the parameters
        handTool.param = {
          parameter: row.parameter,
          measure: row.measure,
        };
      }
    });

    return Array.from<CalcResponseDTO>(componentsMap.values());
  }
}
