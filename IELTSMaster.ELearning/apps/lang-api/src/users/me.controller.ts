import { Body, Controller, Patch } from '@nestjs/common';
import type { AuthUser } from '@lang/shared';
import {
  CurrentUser,
  type RequestUser,
} from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

/** API của chính user đang đăng nhập (`GET contexts` thêm ở Step 6). */
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    return this.users.updateProfile(user.id, dto);
  }
}
