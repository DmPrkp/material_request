import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZayavkaDto } from './dto/create-zayavka.dto';

@Injectable()
export class ZayavkaService {
  constructor(private prisma: PrismaService) {}

  async create(createZayavkaDto: CreateZayavkaDto) {
    createZayavkaDto;
    return this.prisma.zayavka.create({
      data: {
        data: JSON.stringify(createZayavkaDto), // Serialize the nested data
      },
    });
  }

  async findAll() {
    return this.prisma.zayavka.findMany();
  }

  async findOne(id: number) {
    const zayavka = await this.prisma.zayavka.findUnique({
      where: { id },
    });

    if (zayavka) {
      return {
        ...zayavka,
        data: JSON.parse(zayavka.data as string),
      };
    }

    return null;
  }
}
