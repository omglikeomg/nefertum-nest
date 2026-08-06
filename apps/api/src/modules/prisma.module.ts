import { Module } from '@nestjs/common';
import { PrismaModule as InfrastructurePrismaModule } from '../infrastructure/database/prisma/prisma.module';

@Module({
  imports: [InfrastructurePrismaModule],
  exports: [InfrastructurePrismaModule],
})
export class PrismaModule {}
