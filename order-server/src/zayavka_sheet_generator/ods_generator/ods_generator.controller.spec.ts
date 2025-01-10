import { Test, TestingModule } from '@nestjs/testing';
import { XlsxGeneratorController } from './ods_generator.controller';

describe('XlsxGeneratorController', () => {
  let controller: XlsxGeneratorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [XlsxGeneratorController],
    }).compile();

    controller = module.get<XlsxGeneratorController>(XlsxGeneratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
