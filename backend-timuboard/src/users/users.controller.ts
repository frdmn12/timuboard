import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiErrorResponses,
} from '../common/swagger/api-envelope.decorator';
import { ApiSecured } from '../common/swagger/api-secured.decorator';
import { Controller, Get, NotFoundException } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiSecured()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Profil pengguna saat ini',
    description: 'Mengembalikan akun pemilik access token.',
  })
  @ApiEnvelopeResponse(UserResponseDto)
  @ApiErrorResponses([404, 'Akun sudah tidak ada.'])
  @Get('me')
  async me(@CurrentUser() auth: AuthUser): Promise<UserResponseDto> {
    const user = await this.usersService.findById(auth.id);
    if (!user) throw new NotFoundException('User not found');
    return UserResponseDto.from(user);
  }
}
