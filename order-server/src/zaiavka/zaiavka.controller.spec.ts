import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ZaiavkaController } from './zaiavka.controller';
import { claimSchema } from './zaiavka.dto';
import { ZaiavkaService } from './zaiavka.service';

describe('ZaiavkaController', () => {
  let controller: ZaiavkaController;
  // Моки держим сами: через module.get методы сервиса отрываются от объекта (unbound-method).
  const service = {
    create: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn(),
    get: vi.fn(),
    lookup: vi.fn(),
    claim: vi.fn(),
    remove: vi.fn(),
  };

  const user = { id: 7, role: 'USER' as const };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZaiavkaController],
      providers: [
        {
          provide: ZaiavkaService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ZaiavkaController>(ZaiavkaController);
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

    void controller.create(mockData, user);
    expect(service.create).toHaveBeenCalledWith(mockData, user);

    void controller.put(3, mockData, user, 'k');
    expect(service.put).toHaveBeenCalledWith(3, mockData, user, 'k');

    void controller.findAll(user);
    expect(service.getAll).toHaveBeenCalledWith(user);

    void controller.findAll(undefined, '3,5');
    expect(service.lookup).toHaveBeenCalledWith([3, 5]);

    void controller.claim({ items: [{ id: 3, key: 'k' }] }, user);
    expect(service.claim).toHaveBeenCalledWith(user, [{ id: 3, key: 'k' }]);

    void controller.remove(3, user, 'k');
    expect(service.remove).toHaveBeenCalledWith(3, user, 'k');
  });

  it('без входа и без ids — 401, кривые ids и items — 400', () => {
    expect(() => controller.findAll()).toThrow(UnauthorizedException);
    expect(() => controller.findAll(undefined, '1,x')).toThrow(BadRequestException);
    // Тело claim проверяет Zod-пайп до контроллера (zaiavka.dto.ts).
    expect(claimSchema.safeParse({ items: [{ id: 1 }] }).success).toBe(false);
    expect(claimSchema.safeParse({ items: [{ id: 1, key: 'k' }] }).success).toBe(true);

    void controller.findOne(1);
    expect(service.get).toHaveBeenCalledWith(1);
  });
});
