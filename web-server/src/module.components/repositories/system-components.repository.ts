import { Injectable } from '@nestjs/common';
import { PostgresClient } from '~/db/PostgresClient';

import { SystemType } from '~/types';
import { ComponentDTO } from '../types/main-menu';

@Injectable()
export class SystemComponentsRepositories {
  constructor(private readonly postgresClient: PostgresClient) {}

  async getComponents(systemTitle: SystemType['title']) {
    return this.postgresClient.query<ComponentDTO>(
      `SELECT components.id, components.title, components.layer
       FROM systems 
       LEFT JOIN components
       ON systems.id = components.system_id
       WHERE systems.title = '${systemTitle}'
       ORDER BY components.layer ASC
       ;`,
    );
  }
}
