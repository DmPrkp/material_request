import { Inject, Injectable } from '@nestjs/common';

import { RawHandToolResult, CalcRequestDTO, RawPowerToolResult, RawMaterialResult } from '../types';
import { Pool } from 'pg';
import { PGClientName } from '~/db/PostgresClient';

@Injectable()
export class CalcRepositories {
  constructor(@Inject(PGClientName) private readonly pgClient: Pool) {}

  async getHandTools(
    components: CalcRequestDTO['components'],
    crew: CalcRequestDTO['crew'],
  ): Promise<RawHandToolResult[]> {
    const handToolQuery = `
      SELECT 
        components_hand_tools_consumption.id AS consumption_id,
        components.id AS component_id, 
        components.title AS component_title,
        hand_tools.id AS hand_tool_id, 
        hand_tools.title AS hand_tool_title, 
        hand_tools.ru_title,
        ARRAY_AGG(
          json_build_object(
            'id', hand_tool_params.id, 
            'param', hand_tool_params.parameter, 
            'measure', hand_tool_params.measure
          )
        ) FILTER (WHERE hand_tool_params.id IS NOT NULL) AS params,
        components_hand_tools_consumption.consumption * ${crew} AS adjusted_consumption

      FROM components_hand_tools_consumption

      LEFT JOIN components
        ON components_hand_tools_consumption.component_id = components.id

      LEFT JOIN hand_tools
        ON components_hand_tools_consumption.hand_tools_id = hand_tools.id

      LEFT JOIN hand_tool_params_hand_tools
        ON components_hand_tools_consumption.id = hand_tool_params_hand_tools.id

      LEFT JOIN hand_tool_params
        ON hand_tool_params_hand_tools.params = hand_tool_params.id

      WHERE components_hand_tools_consumption.component_id IN (${Object.keys(components).join(',')})

      GROUP BY 
        components_hand_tools_consumption.id,
        components.id,
        hand_tools.id,
        hand_tools.title,
        hand_tools.ru_title,
        components_hand_tools_consumption.consumption

      ORDER BY components.id ASC;
    `;

    const { rows } = await this.pgClient.query<RawHandToolResult>(handToolQuery);
    return rows;
  }

  async getPowerTools(
    components: CalcRequestDTO['components'],
    crew: CalcRequestDTO['crew'],
  ): Promise<RawPowerToolResult[]> {
    const powerToolQuery = `
      SELECT 
        components_power_tools_consumption.id AS consumption_id,
        components.id AS component_id, 
        components.title AS component_title,
        power_tools.id AS power_tool_id, 
        power_tools.title AS power_tool_title, 
        power_tools.ru_title,
        power_tools.corded,
        ARRAY_AGG(
          json_build_object(
            'id', power_tool_params.id, 
            'param', power_tool_params.parameter, 
            'measure', power_tool_params.measure
          )
        ) FILTER (WHERE power_tool_params.id IS NOT NULL) AS params,
        components_power_tools_consumption.consumption * ${crew} AS adjusted_consumption

      FROM components_power_tools_consumption

      LEFT JOIN components
        ON components_power_tools_consumption.component_id = components.id

      LEFT JOIN power_tools
        ON components_power_tools_consumption.power_tools_id = power_tools.id

      LEFT JOIN power_tool_params_power_tools
        ON components_power_tools_consumption.id = power_tool_params_power_tools.id

      LEFT JOIN power_tool_params
        ON power_tool_params_power_tools.params = power_tool_params.id

      WHERE components_power_tools_consumption.component_id IN (${Object.keys(components).join(',')})

      GROUP BY 
        components_power_tools_consumption.id,
        components.id,
        power_tools.id,
        power_tools.title,
        power_tools.ru_title

      ORDER BY components.id ASC;
  `;

    const { rows } = await this.pgClient.query<RawPowerToolResult>(powerToolQuery);
    return rows;
  }

  async getMaterials(components: CalcRequestDTO['components']): Promise<RawMaterialResult[]> {
    const materialsQuery = `
    SELECT 
      components.id AS component_id, 
      components.title AS component_title,
      materials.id AS materials_id, 
      materials.title AS materials_title, 
      materials.ru_title AS materials_ru_title,
      materials.measure,
      components_materials_consumption.consumption AS consumption

    FROM components_materials_consumption

    LEFT JOIN components
      ON components_materials_consumption.component_id = components.id

    LEFT JOIN materials
      ON components_materials_consumption.materials_id = materials.id

    WHERE components_materials_consumption.component_id IN 
    (${Object.keys(components).join(',')})
    ORDER BY components.layer ASC;
  `;
    const { rows } = await this.pgClient.query<RawMaterialResult>(materialsQuery);
    return rows;
  }
}
