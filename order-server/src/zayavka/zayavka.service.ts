import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZayavkaDto } from '../types';

@Injectable()
export class ZayavkaService {
  constructor(private prisma: PrismaService) {}

  async create(createZayavkaDto: CreateZayavkaDto) {
    const user = Number(createZayavkaDto.user) || 1;
    delete createZayavkaDto.user;
    return this.prisma.zayavka.create({
      data: {
        user,
        data: JSON.stringify(createZayavkaDto), // Serialize the nested data
      },
    });
  }

  async put(id: number, createZayavkaDto: CreateZayavkaDto) {
    delete createZayavkaDto.user;
    delete createZayavkaDto.system;
    return this.prisma.zayavka.update({
      where: {
        id: id, // Assuming `id` is the primary key or unique identifier
      },
      data: {
        data: JSON.stringify(createZayavkaDto), // Serialize the nested data
      },
    });
  }

  async getAll(user?: number) {
    return this.prisma.zayavka.findMany({
      where: { user: user || 1 },
      orderBy: {
        id: 'desc',
      },
    });
  }

  get(id: number) {
    return this.prisma.zayavka.findUnique({
      where: { id },
    });
  }
}
