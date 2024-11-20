import { Pool } from 'pg';
import { readdir, readFile } from 'node:fs/promises';

const MIGRATION_PATH = __dirname + '/migrations/';
const SEED_PATH = __dirname + '/seed/';

async function checkIsDBExist(client) {
  const { rows } = await client.query(
    "SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE lower(datname) = lower('matli'));",
  );

  const { exists } = rows[0];
  return exists;
}

console.log('process.env.DB_HOST', process.env.DB_HOST);
console.log('process.env.DB_PORT', process.env.DB_PORT);
console.log('process.env.POSTGRES_USER', process.env.POSTGRES_USER);
console.log('process.env.POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD);

export class PGClientFactory {
  private static instance: Pool;

  private constructor() {}

  public static async getInstance(): Promise<Pool> {
    if (!PGClientFactory.instance) {
      PGClientFactory.instance = await PGClientFactory.initialize();
    }
    return PGClientFactory.instance;
  }

  private static async initialize(): Promise<Pool> {
    const client = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: 'matli',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });

    const fileNames = await readdir(MIGRATION_PATH);

    const isExist = await checkIsDBExist(client);
    console.log('DB is exist: ' + isExist);

    if (isExist) {
      await PGClientFactory.downMigration(fileNames, client);
    }

    await PGClientFactory.upMigration(fileNames, client);
    await PGClientFactory.seedData(client);

    return client;
  }

  private static async downMigration(fileNames, client) {
    // Remove old data
    const downFileNames = fileNames.filter((elm) => elm.match(/.*\.(down.sql?)/gi)).reverse();

    const downFiles = await Promise.all(downFileNames.map((name) => readFile(MIGRATION_PATH + name, 'utf-8')));

    for (const file of downFiles) {
      try {
        await client.query(file);
      } catch (error) {
        console.error('Error executing remove query: ', error, file);
      }
    }
  }

  private static async upMigration(fileNames, client) {
    // Add new data
    const upFileNames = fileNames.filter((elm) => elm.match(/.*\.(up.sql?)/gi));

    const upFiles = await Promise.all(upFileNames.map((name) => readFile(MIGRATION_PATH + name, 'utf-8')));

    for (const file of upFiles) {
      try {
        await client.query(file);
      } catch (error) {
        console.error('Error executing up migration file:', file);
        console.error('Error executing up migration error:', error);
      }
    }
  }

  private static async seedData(client) {
    const fileNames = await readdir(SEED_PATH);

    const filesBuff = await Promise.all(fileNames.map((name) => readFile(SEED_PATH + name)));
    const files = filesBuff.map((file) => file.toString());

    for (const file of files) {
      try {
        await client.query(file);
      } catch (error) {
        console.error('Error executing up seed file:', file);
        console.error('Error executing up seed error:', error);
      }
    }
  }
}
