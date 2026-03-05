import { Controller, Post, Get, Put, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UserResponseDto,
  UpdateUserDto,
} from '@devdutt/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Mobile number or username already exists' })
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with mobile number and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or account locked' })
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return this.authService.getProfile(req.user.username);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.authService.updateProfile(req.user.username, dto);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.authService.changePassword(req.user.username, dto);
  }

  @Post('mobile/verify/send')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Send verification code to mobile' })
  @ApiResponse({ status: 204, description: 'Verification code sent' })
  async sendVerificationCode(@Body() body: { mobileNumber: string; purpose: string }): Promise<void> {
    return this.authService.sendVerificationCode(body.mobileNumber, body.purpose);
  }

  @Post('mobile/verify/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify mobile number with code' })
  @ApiResponse({ status: 200, description: 'Verification successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyMobileNumber(
    @Body() body: { mobileNumber: string; code: string; purpose: string },
  ): Promise<{ verified: boolean }> {
    const verified = await this.authService.verifyCode(body.mobileNumber, body.code, body.purpose);
    if (!verified) {
      return { verified: false };
    }
    return { verified: true };
  }
}

