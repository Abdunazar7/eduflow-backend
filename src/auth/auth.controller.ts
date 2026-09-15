import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  CreateUserByAdminDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  ResendOtpDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import {
  GetCurrentUser,
  GetCurrentUserId,
  Public,
} from '../commons/decorators';
import { CreateRoleGuard, RefreshTokenGuard } from '../commons/guards';
import type { JwtPayload } from '../commons/types';

const PER_MINUTE = 60_000;

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBearerAuth()
  @UseGuards(CreateRoleGuard)
  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an inactive user (Admin / Manager / Platform Admin)',
    description:
      'If the phone is already linked to the Telegram bot, an activation code is sent. The user receives their password over Telegram when they activate.',
  })
  createUser(
    @Body() dto: CreateUserByAdminDto,
    @GetCurrentUser() user: JwtPayload,
  ) {
    return this.authService.createUserAndSendOtp(dto, user);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: PER_MINUTE } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with phone and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken, refreshToken and user',
  })
  @ApiResponse({ status: 401, description: 'Wrong phone or password' })
  @ApiResponse({
    status: 403,
    description: 'Account not activated, or tenant suspended',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: PER_MINUTE } })
  @Post('verify-activation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate an account with the Telegram code',
    description:
      'On success the password is delivered to the user over Telegram. Five wrong codes invalidate it.',
  })
  verifyActivation(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyActivationOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: PER_MINUTE } })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a new activation code' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out (invalidates the refresh token)' })
  logout(@GetCurrentUserId() userId: number) {
    return this.authService.logout(userId);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Throttle({ default: { limit: 30, ttl: PER_MINUTE } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new token pair',
    description:
      'Send { "refreshToken": "..." } in the body. The old refresh token stops working.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid, reused or expired',
  })
  refreshTokens(
    @Body() _dto: RefreshTokenDto,
    @GetCurrentUserId() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: PER_MINUTE } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a new password to the account holder over Telegram',
    description:
      'Always returns the same response, whether or not the number is registered.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.phone);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: PER_MINUTE } })
  @Post('init')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'One-time platform bootstrap',
    description:
      'Creates the PLATFORM_ADMIN from SUPER_ADMIN_PHONE / SUPER_ADMIN_PASSWORD in .env, plus default plans. Fails once an admin exists.',
  })
  @ApiResponse({ status: 201, description: 'Platform initialised' })
  @ApiResponse({ status: 403, description: 'Already initialised' })
  init() {
    return this.authService.initPlatform();
  }
}
