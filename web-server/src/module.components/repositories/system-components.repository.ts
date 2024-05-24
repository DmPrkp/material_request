import { Injectable } from '@nestjs/common';
import { PostgresClient } from '~/db/PostgresClient';

import { SystemType } from '~/types';
import { ComponentDTO } from '../types/main-menu';

@Injectable()
export class SystemComponentsRepositories {
  constructor(private readonly postgresClient: PostgresClient) {}

  async getComponents(systemTitle: SystemType['title']) {
    return this.postgresClient.query<ComponentDTO>(
      `SELECT component.id, component.title, component.layer
       FROM system 
       LEFT JOIN component
       ON system.id = component.system_id
       WHERE system.title = '${systemTitle}'
       ORDER BY component.layer ASC
       ;`,
    );
  }
}
