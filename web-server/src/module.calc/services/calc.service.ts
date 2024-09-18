import { Injectable } from '@nestjs/common';
import { CalcRepositories } from '../repositories/calc.repository';
import { CalcRequestDTO, CalcResponseDTO } from '../types';

@Injectable()
export class CalcService {
  constructor(private readonly calcRepositories: CalcRepositories) {}

  async calculateMatList(calcRequestDTO: CalcRequestDTO): Promise<CalcResponseDTO[]> {
    const { components, crew } = calcRequestDTO;
    const handTools = await this.calcRepositories.getHandTools(components, crew);
    const powerTools = await this.calcRepositories.getPowerTools(components, crew);
    const materials = await this.calcRepositories.getMaterials(components);

    const componentsMap = new Map<number, CalcResponseDTO>();

    // Process Hand Tools
    handTools.forEach((row) => {
      const componentId = row.component_id;

      // Initialize component if not already in map
      if (!componentsMap.has(componentId)) {
        componentsMap.set(componentId, {
          id: componentId,
          title: row.component_title,
          hand_tools: [],
          power_tools: [],
          materials: [],
        });
      }

      const component = componentsMap.get(componentId);

      // Find or create the hand tool within the component's hand_tools array
      let handTool = component.hand_tools.find((ht) => ht.id === row.hand_tool_id);

      if (!handTool) {
        handTool = {
          id: row.hand_tool_id,
          title: row.hand_tool_title,
          ru_title: row.ru_title,
          adjusted_consumption: row.adjusted_consumption,
          params: [],
        };
        component.hand_tools.push(handTool);
      }

      // Add the parameter to the hand tool's params array
      handTool.params.push({
        parameter: row.parameter,
        measure: row.measure,
      });
    });

    // Process Power Tools
    powerTools.forEach((row) => {
      const componentId = row.component_id;
      const component = componentsMap.get(componentId);

      // Find or create the power tool within the component's power_tools array
      let powerTool = component.power_tools.find((pt) => pt.id === row.power_tool_id);

      if (!powerTool) {
        powerTool = {
          id: row.power_tool_id,
          title: row.power_tool_title,
          ru_title: row.ru_title,
          corded: row.corded,
          adjusted_consumption: row.adjusted_consumption,
          params: [],
        };
        component.power_tools.push(powerTool);
      }

      // Add the parameter to the power tool's params array
      powerTool.params.push({
        parameter: row.parameter,
        measure: row.measure,
      });
    });

    // Process Materials

    // Convert the map to an array
    return Array.from(componentsMap.values());
  }
}
