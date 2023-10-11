import { Test, TestingModule } from '@nestjs/testing';
import { MainMenuController } from './main-menu.controller';

describe('MainMenuController', () => {
  let controller: MainMenuController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MainMenuController],
    }).compile();

    controller = module.get<MainMenuController>(MainMenuController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
