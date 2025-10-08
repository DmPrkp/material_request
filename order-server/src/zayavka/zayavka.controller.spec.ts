import { Test, TestingModule } from '@nestjs/testing';
import { ZayavkaController } from './zayavka.controller';
import { ZayavkaService } from './zayavka.service';

describe('ZayavkaController', () => {
  let controller: ZayavkaController;
  let service: ZayavkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZayavkaController],
      providers: [
        {
          provide: ZayavkaService,
          useValue: {
            create: jest.fn(),
            put: jest.fn(),
            getAll: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ZayavkaController>(ZayavkaController);
    service = module.get<ZayavkaService>(ZayavkaService);
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
      user: 1
    };
    
    controller.create(mockData);
    expect(service.create).toHaveBeenCalledWith(mockData);
    
    controller.findAll();
    expect(service.getAll).toHaveBeenCalled();
    
    controller.findOne('1');
    expect(service.get).toHaveBeenCalledWith(1);
  });
});
