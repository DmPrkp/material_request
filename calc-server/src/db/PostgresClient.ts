import { Module } from '@nestjs/common';
import { PGClientFactory } from './db.factory';

export const PGClientName = Symbol('PGClient');
@Module({
  providers: [
    {
      provide: PGClientName,
      useFactory: async () => {
        return await PGClientFactory.getInstance();
      },
    },
  ],
  exports: [PGClientName],
})
export class DatabaseModule {}
