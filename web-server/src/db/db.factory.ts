import { Client } from 'pg';

export const PGClient = Symbol('PGClient');

export const PGClientFactory = {
  provide: PGClient,
  useFactory: async (): Promise<typeof Client> => {
    const client = new Client({
      host: 'db',
      port: '5432',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });

    await client.connect();
    return client;
  },
};
