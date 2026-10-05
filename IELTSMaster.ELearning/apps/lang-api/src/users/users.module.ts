import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeController } from './me.controller';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [MeController],
  providers: [UsersService],
  // Repository<User> cho AuthModule (AuthService, JwtAuthGuard).
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
