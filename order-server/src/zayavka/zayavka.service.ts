import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZayavkaDto } from './dto/create-zayavka.dto';

@Injectable()
export class ZayavkaService {
  constructor(private prisma: PrismaService) {}

  async create(createZayavkaDto: CreateZayavkaDto) {
    return this.prisma.zayavka.create({
      data: {
        data: JSON.stringify(createZayavkaDto), // Serialize the nested data
      },
    });
  }

  async put(id: number, createZayavkaDto: CreateZayavkaDto) {
    return this.prisma.zayavka.update({
      where: {
        id: id, // Assuming `id` is the primary key or unique identifier
      },
      data: {
        data: JSON.stringify(createZayavkaDto), // Serialize the nested data
      },
    });
  }

  async findAll() {
    return this.prisma.zayavka.findMany();
  }

  findOne(id: number) {
    return this.prisma.zayavka.findUnique({
      where: { id },
    });

    // if (zayavka) {
    //   return {
    //     ...zayavka,
    //     data: JSON.parse(zayavka.data as string),
    //   };
    // }

    // return null;
  }
}
