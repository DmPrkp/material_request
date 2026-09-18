import { Test, TestingModule } from '@nestjs/testing';
import { ZaiavkaController } from './zaiavka.controller';
import { ZaiavkaService } from './zaiavka.service';

describe('ZaiavkaController', () => {
  let controller: ZaiavkaController;
  let service: ZaiavkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZaiavkaController],
      providers: [
        {
          provide: ZaiavkaService,
          useValue: {
            create: jest.fn(),
            put: jest.fn(),
            getAll: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ZaiavkaController>(ZaiavkaController);
    service = module.get<ZaiavkaService>(ZaiavkaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service methods', () => {
    const mockData = {
      hand_tools: [],
      materials: [],
      power_tools: [],
      system: 'test',
      user: 1,
    };

    controller.create(mockData);
    expect(service.create).toHaveBeenCalledWith(mockData);

    controller.findAll();
    expect(service.getAll).toHaveBeenCalled();

    controller.findOne('1');
    expect(service.get).toHaveBeenCalledWith(1);
  });
});
