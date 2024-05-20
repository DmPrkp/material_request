import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';

const MIGRATION_PATH = __dirname + '/migrations/';

export const PGClient = Symbol('PGClient');

export const PGClientFactory = {
  provide: PGClient,
  useFactory: async (): Promise<typeof Pool> => {
    const client = await new Pool({
      host: 'db',
      port: '5432',
      database: 'matli',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });

    const fileNames = (await readdir(MIGRATION_PATH)).filter((elm) =>
      elm.match(/.*\.(up.sql?)/gi),
    );

    const filesBuff = await Promise.all(
      fileNames.map((name) => readFile(MIGRATION_PATH + name)),
    );

    const files = filesBuff.map((file) => file.toString());

    await Promise.all(files.map((file) => client.query(file)));

    return client;
  },
};
