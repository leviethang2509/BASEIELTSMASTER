import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AuthUser } from '@lang/shared';
import type { Repository } from 'typeorm';
import { toAuthUser } from './auth-user';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** Chỉ cập nhật trường có trong body; chuỗi rỗng/`null` xoá trường tuỳ chọn. */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    const changes: Partial<
      Pick<User, 'fullName' | 'dateOfBirth' | 'gender' | 'phone' | 'address'>
    > = {};
    if (dto.fullName !== undefined) changes.fullName = dto.fullName;
    if (dto.dateOfBirth !== undefined) changes.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) changes.gender = dto.gender;
    if (dto.phone !== undefined) changes.phone = dto.phone || null;
    if (dto.address !== undefined) changes.address = dto.address || null;

    if (Object.keys(changes).length > 0) {
      await this.users.update(user.id, changes);
    }
    return toAuthUser({ ...user, ...changes });
  }
}
