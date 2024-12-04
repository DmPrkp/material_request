import { generateKey } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';

import { PGClientName } from '~/db/PostgresClient';
import { Pool } from 'pg';

@Injectable()
export class CacheRepositories {
  constructor(@Inject(PGClientName) private readonly pgClient: Pool) {}

  async get<ReturnedData>(query: string): Promise<ReturnedData> {
    const { rows } = await this.pgClient.query<ReturnedData>(`SELECT * FROM cache WHERE key = '${query}';`);
    return rows[0];
  }

  async delete(query: string): Promise<any> {
    const answer = await this.pgClient.query(`DELETE FROM cache WHERE key = '${query}';`);
    return answer;
  }

  async set(key: string, query: string): Promise<any> {
    // const hash = generateKey('hmac', { length: 512 }, (err, key) => {
    //   if (err) throw err;
    //   console.log(key.export().toString('hex'));
    //   return key.export().toString('hex');
    // });
    const answer = await this.pgClient.query(`
      INSERT INTO cache (key, value) 
      VALUES ('${key}', '${query}');`);
    return answer;
  }
}
