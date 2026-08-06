import { Controller, Get } from '@nestjs/common';

@Controller('admin/perfumes')
export class PerfumeAdminController {
  @Get()
  findAll(): { id: string }[] {
    return [];
  }
}
