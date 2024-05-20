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

    const fileNames = await readdir(MIGRATION_PATH);

    // remove old data
    const downFileNames = fileNames.filter((elm) =>
      elm.match(/.*\.(down.sql?)/gi),
    );
    const downFilesBuff = await Promise.all(
      downFileNames.map((name) => readFile(MIGRATION_PATH + name)),
    );
    const downFiles = downFilesBuff.map((file) => file.toString());
    await Promise.all(downFiles.map((file) => client.query(file)));

    // add new data
    const upFileNames = fileNames.filter((elm) => elm.match(/.*\.(up.sql?)/gi));
    const upFilesBuff = await Promise.all(
      upFileNames.map((name) => readFile(MIGRATION_PATH + name)),
    );
    const upFiles = upFilesBuff.map((file) => file.toString());
    await Promise.all(upFiles.map((file) => client.query(file)));

    return client;
  },
};
