import { Injectable } from '@nestjs/common';
import { PostgresClient } from '~/db/PostgresClient';

import { SystemType } from '~/types';
import { CalcDTO } from '../types';

@Injectable()
export class CalcRepositories {
  constructor(private readonly postgresClient: PostgresClient) {}

  async getComponents(systemTitle: SystemType['title']) {
    const query = `
      SELECT components.id, components.title, components.layer
      FROM systems 
      LEFT JOIN components
      ON systems.id = components.system_id
      WHERE systems.title = '${systemTitle}'
      ORDER BY components.layer ASC
      ;`;
    return this.postgresClient.query<CalcDTO>(
      `
      SELECT .id
      FROM system
    `,
    );
  }
}
