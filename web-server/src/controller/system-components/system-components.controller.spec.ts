import { Test, TestingModule } from '@nestjs/testing';
import { SystemComponentsController } from './system-components.controller';

describe('SystemComponentsController', () => {
  let controller: SystemComponentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemComponentsController],
    }).compile();

    controller = module.get<SystemComponentsController>(
      SystemComponentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
