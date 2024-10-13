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

      const handTool = {
        id: row.hand_tool_id,
        title: row.hand_tool_title,
        ru_title: row.ru_title,
        adjusted_consumption: row.adjusted_consumption,
        params: row.params || [],
      };
      component.hand_tools.push(handTool);
    });

    // Process Power Tools
    powerTools.forEach((row) => {
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
    });

    // Process Materials
    materials.forEach((material) => {
      const componentId = material.component_id;

      // Initialize component if not already in map
      if (!componentsMap.has(componentId)) {
        componentsMap.set(componentId, {
          id: componentId,
          title: material.component_title,
          hand_tools: [],
          power_tools: [],
          materials: [],
        });
      }

      const component = componentsMap.get(componentId);
      const { materials_id, materials_title, consumption, measure, materials_ru_title } = material;

      const resMaterial = {
        id: materials_id,
        title: materials_title,
        ru_title: materials_ru_title,
        measure,
        consumption,
        params: [],
        volume: components[componentId],
      };

      if (components[componentId]) {
        component.materials.push(resMaterial);
      }
    });

    // Convert the map to an array
    return Array.from(componentsMap.values());
  }
}
