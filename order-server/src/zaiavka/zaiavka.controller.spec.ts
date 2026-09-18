import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ZaiavkaController } from './zaiavka.controller';
import { ZaiavkaService } from './zaiavka.service';

describe('ZaiavkaController', () => {
  let controller: ZaiavkaController;
  let service: ZaiavkaService;

  const user = { id: 7, login: 'ivan', role: 'USER' as const };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZaiavkaController],
      providers: [
        JwtService,
        {
          provide: ZaiavkaService,
          useValue: {
            create: jest.fn(),
            put: jest.fn(),
            getAll: jest.fn(),
            get: jest.fn(),
            lookup: jest.fn(),
            claim: jest.fn(),
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

  it('передаёт в сервис пользователя из токена', () => {
    const mockData = {
      hand_tools: [],
      materials: [],
      power_tools: [],
      system: 'test',
    };

    controller.create(mockData, user);
    expect(service.create).toHaveBeenCalledWith(mockData, user);

    controller.put(3, mockData, user, 'k');
    expect(service.put).toHaveBeenCalledWith(3, mockData, user, 'k');

    controller.findAll(user);
    expect(service.getAll).toHaveBeenCalledWith(user);

    controller.findAll(undefined, '3,5');
    expect(service.lookup).toHaveBeenCalledWith([3, 5]);

    controller.claim({ items: [{ id: 3, key: 'k' }] }, user);
    expect(service.claim).toHaveBeenCalledWith(user, [{ id: 3, key: 'k' }]);
  });

  it('без входа и без ids — 401, кривые ids и items — 400', () => {
    expect(() => controller.findAll()).toThrow(UnauthorizedException);
    expect(() => controller.findAll(undefined, '1,x')).toThrow(BadRequestException);
    expect(() => controller.claim({ items: [{ id: 1 }] }, user)).toThrow(BadRequestException);

    controller.findOne(1);
    expect(service.get).toHaveBeenCalledWith(1);
  });
});
