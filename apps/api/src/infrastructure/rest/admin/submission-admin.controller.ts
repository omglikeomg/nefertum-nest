import { Controller, Get, Param, Post } from '@nestjs/common';

@Controller('admin/submissions')
export class SubmissionAdminController {
  @Get()
  findAll(): { id: string }[] {
    return [];
  }

  @Post(':id/approve')
  approve(@Param('id') id: string): { id: string } {
    return { id };
  }
}
