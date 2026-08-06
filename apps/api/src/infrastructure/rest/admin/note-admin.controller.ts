import { Controller, Get } from '@nestjs/common';

@Controller('admin/notes')
export class NoteAdminController {
  @Get()
  findAll(): { id: string }[] {
    return [];
  }
}
