import { Inject, Injectable } from '@nestjs/common';

import { SystemType } from '~/types';
import { ComponentDTO } from '../types/main-menu';
import { PGClientName } from '~/db/PostgresClient';
import { Pool } from 'pg';

@Injectable()
export class SystemComponentsRepositories {
  constructor(@Inject(PGClientName) private readonly pgClient: Pool) {}

  async getComponents(systemTitle: SystemType['title']) {
    const { rows } = await this.pgClient.query<ComponentDTO>(
      `SELECT components.id, components.title, components.layer
       FROM systems 
       LEFT JOIN components
       ON systems.id = components.system_id
       WHERE systems.title = '${systemTitle}'
       ORDER BY components.layer ASC
       ;`,
    );
    return rows;
  }
}
