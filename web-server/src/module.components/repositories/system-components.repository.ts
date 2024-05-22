import { Injectable } from '@nestjs/common';
import { PostgresClient } from '~/db/PostgresClient';

import { SystemType } from '~/types';

@Injectable()
export class SystemComponentsRepositories {
  constructor(private readonly postgresClient: PostgresClient) {}

  async getComponents(systemTitle: SystemType['title']) {
    const client = await this.postgresClient.getClient();
    const { rows } = await client.query(
      `SELECT * FROM system WHERE title = '${systemTitle}';`,
    );
    console.log(rows);
    return rows;
  }
}
