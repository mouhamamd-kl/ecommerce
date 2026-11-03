import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { AdminsService } from './admins.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService,AdminsService],
  exports: [UsersService, TypeOrmModule,AdminsService],
})
export class UsersModule {}