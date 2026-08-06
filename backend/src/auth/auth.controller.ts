import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from '@/auth/auth.service';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { ApiRegisterUser } from '@/auth/swagger/auth.post.register.swagger';
import { ApiLoginUser } from '@/auth/swagger/auth.post.login.swagger';
import { ApiRefreshTokens } from '@/auth/swagger/auth.post.refresh.swagger';
import { JwtRefreshAuthGuard } from '@/auth/jwt-refresh-auth.guard';
import {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} from '@/common/utils/cookie.util';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedRequest } from '@/common/interfaces/request.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiRegisterUser()
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @ApiLoginUser()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);

    setAuthCookies(
      res,
      result.access_token,
      result.refresh_token,
      this.configService,
    );

    return result;
  }

  @Post('refresh')
  @ApiRefreshTokens()
  @UseGuards(JwtRefreshAuthGuard)
  async refreshTokens(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(req.user.id);

    setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      this.configService,
    );

    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
      req.get('Authorization')?.replace(/^Bearer\s+/i, '');

    await this.authService.logout(refreshToken);
    clearAuthCookies(res);
  }
}
