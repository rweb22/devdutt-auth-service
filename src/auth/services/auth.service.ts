import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { VerificationCode } from '../../entities/verification-code.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { CustomJwtService } from './jwt.service';
import type {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UserResponseDto,
  UpdateUserDto,
} from '@devdutt/shared';
import { AccountStatus, UserRole, Sex } from '@devdutt/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly maxLoginAttempts: number;
  private readonly lockoutDuration: number;
  private readonly verificationCodeExpiresIn: number;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(VerificationCode)
    private verificationCodeRepository: Repository<VerificationCode>,
    private cryptoService: CryptoService,
    private jwtService: CustomJwtService,
    private configService: ConfigService,
  ) {
    this.maxLoginAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
    this.lockoutDuration = this.configService.get<number>('ACCOUNT_LOCKOUT_DURATION', 900);
    this.verificationCodeExpiresIn = this.configService.get<number>('VERIFICATION_CODE_EXPIRES_IN', 600);
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Check if mobile number already exists
    const mobileHash = this.cryptoService.hashMobileNumber(dto.mobileNumber);
    const existingUser = await this.userRepository.findOne({
      where: { mobileNumberHash: mobileHash },
    });

    if (existingUser) {
      throw new ConflictException('Mobile number already registered');
    }

    // Check if username already exists
    const existingUsername = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const passwordHash = await this.cryptoService.hashPassword(dto.password);

    // Create user
    const user = this.userRepository.create({
      username: dto.username,
      mobileNumber: dto.mobileNumber,
      mobileNumberHash: mobileHash,
      passwordHash,
      role: UserRole.PUBLIC,
      accountStatus: AccountStatus.ACTIVE, // Auto-activate for now
      fullName: dto.fullName || null,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      sex: dto.sex ? (dto.sex as Sex) : null,
      verifiedAt: new Date(), // Auto-verify for now
      failedLoginAttempts: 0,
      mobileVerifiedAt: new Date(),
      passwordChangedAt: null,
      lockedUntil: null,
      lastLoginAt: null,
    });

    await this.userRepository.save(user);

    this.logger.log(`User registered: ${user.username}`);

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Login with mobile number and password
   */
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    // Find user by mobile number
    const mobileHash = this.cryptoService.hashMobileNumber(dto.mobileNumber);
    const user = await this.userRepository.findOne({
      where: { mobileNumberHash: mobileHash },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingTime} minutes`);
    }

    // Verify password
    const isPasswordValid = await this.cryptoService.verifyPassword(dto.password, user.passwordHash!);

    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;

      // Lock account if max attempts reached
      if (user.failedLoginAttempts >= this.maxLoginAttempts) {
        user.lockedUntil = new Date(Date.now() + this.lockoutDuration * 1000);
        await this.userRepository.save(user);
        throw new UnauthorizedException(`Account locked due to too many failed attempts. Try again in ${this.lockoutDuration / 60} minutes`);
      }

      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account status
    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    if (user.accountStatus === AccountStatus.LOCKED) {
      throw new UnauthorizedException('Account locked');
    }

    // Reset failed attempts and update last login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User logged in: ${user.username}`);

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload = {
      sub: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.generateAccessToken(payload);
    const refreshToken = this.jwtService.generateRefreshToken(payload);

    // Store refresh token in database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.username,
      token: refreshToken,
      expiresAt: new Date(Date.now() + this.jwtService.getRefreshTokenExpiry() * 1000),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtService.getAccessTokenExpiry(),
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token
   */
  async refresh(dto: RefreshTokenDto): Promise<TokenResponseDto> {
    // Verify refresh token
    let payload;
    try {
      payload = this.jwtService.verifyToken(dto.refreshToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: dto.refreshToken },
    });

    if (!refreshTokenEntity) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Check if refresh token is expired
    if (refreshTokenEntity.expiresAt < new Date()) {
      await this.refreshTokenRepository.remove(refreshTokenEntity);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { username: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Delete old refresh token
    await this.refreshTokenRepository.remove(refreshTokenEntity);

    // Generate new tokens
    return this.generateTokens(user);
  }

  /**
   * Logout (invalidate refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    const refreshTokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (refreshTokenEntity) {
      await this.refreshTokenRepository.remove(refreshTokenEntity);
      this.logger.log(`User logged out: ${refreshTokenEntity.userId}`);
    }
  }

  /**
   * Get user profile
   */
  async getProfile(username: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(username: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.dateOfBirth) user.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.sex) user.sex = dto.sex;

    await this.userRepository.save(user);

    this.logger.log(`User profile updated: ${username}`);

    return this.mapUserToResponse(user);
  }

  /**
   * Change password
   */
  async changePassword(username: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.cryptoService.verifyPassword(dto.currentPassword, user.passwordHash!);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    user.passwordHash = await this.cryptoService.hashPassword(dto.newPassword);
    user.passwordChangedAt = new Date();

    await this.userRepository.save(user);

    // Invalidate all refresh tokens for this user
    await this.refreshTokenRepository.delete({ userId: username });

    this.logger.log(`Password changed for user: ${username}`);
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(mobileNumber: string, purpose: string): Promise<void> {
    // Generate code
    const code = this.cryptoService.generateVerificationCode();

    // Save to database
    const verificationCode = this.verificationCodeRepository.create({
      mobileNumber,
      code,
      purpose,
      expiresAt: new Date(Date.now() + this.verificationCodeExpiresIn * 1000),
    });

    await this.verificationCodeRepository.save(verificationCode);

    // TODO: Send SMS (mock for now)
    this.logger.log(`Verification code sent to ${mobileNumber}: ${code} (purpose: ${purpose})`);
    console.log(`[MOCK SMS] Code: ${code} to ${mobileNumber}`);
  }

  /**
   * Verify verification code
   */
  async verifyCode(mobileNumber: string, code: string, purpose: string): Promise<boolean> {
    const verificationCode = await this.verificationCodeRepository
      .createQueryBuilder('vc')
      .where('vc.mobileNumber = :mobileNumber', { mobileNumber })
      .andWhere('vc.code = :code', { code })
      .andWhere('vc.purpose = :purpose', { purpose })
      .andWhere('vc.usedAt IS NULL')
      .orderBy('vc.createdAt', 'DESC')
      .getOne();

    if (!verificationCode) {
      return false;
    }

    if (verificationCode.expiresAt < new Date()) {
      return false;
    }

    // Mark as used
    verificationCode.usedAt = new Date();
    await this.verificationCodeRepository.save(verificationCode);

    return true;
  }

  /**
   * Map User entity to UserResponseDto
   */
  private mapUserToResponse(user: User): UserResponseDto {
    return {
      username: user.username,
      mobileNumber: `******${user.mobileNumber.slice(-4)}`, // Masked
      mobileVerifiedAt: user.mobileVerifiedAt?.toISOString(),
      role: user.role,
      accountStatus: user.accountStatus,
      fullName: user.fullName || undefined,
      dateOfBirth: user.dateOfBirth?.toISOString(),
      sex: user.sex || undefined,
      verifiedAt: user.verifiedAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}


