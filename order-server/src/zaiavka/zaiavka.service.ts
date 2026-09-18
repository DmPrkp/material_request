import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZaiavkaDto } from '../types';

@Injectable()
export class ZaiavkaService {
  constructor(private prisma: PrismaService) {}

  async create(createZaiavkaDto: CreateZaiavkaDto) {
    const user = Number(createZaiavkaDto.user) || 1;
    delete createZaiavkaDto.user;
    return this.prisma.zaiavka.create({
      data: {
        user,
        data: JSON.stringify(createZaiavkaDto), // Serialize the nested data
      },
    });
  }

  async put(id: number, createZaiavkaDto: CreateZaiavkaDto) {
    delete createZaiavkaDto.user;
    delete createZaiavkaDto.system;
    return this.prisma.zaiavka.update({
      where: {
        id: id, // Assuming `id` is the primary key or unique identifier
      },
      data: {
        data: JSON.stringify(createZaiavkaDto), // Serialize the nested data
      },
    });
  }

  async getAll(user?: number) {
    return this.prisma.zaiavka.findMany({
      where: { user: user || 1 },
      orderBy: {
        id: 'desc',
      },
    });
  }

  get(id: number) {
    return this.prisma.zaiavka.findUnique({
      where: { id },
    });
  }
}
