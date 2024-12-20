import { Test, TestingModule } from '@nestjs/testing';
import { ZayavkaController } from './zayavka.controller';

describe('ZayavkaController', () => {
  let controller: ZayavkaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZayavkaController],
    }).compile();

    controller = module.get<ZayavkaController>(ZayavkaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
