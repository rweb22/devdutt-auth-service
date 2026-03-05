import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly bcryptRounds: number;
  private readonly verificationCodeLength: number;

  constructor(private configService: ConfigService) {
    this.bcryptRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    this.verificationCodeLength = this.configService.get<number>('VERIFICATION_CODE_LENGTH', 6);
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hash a mobile number for storage (one-way hash)
   */
  hashMobileNumber(mobileNumber: string): string {
    return crypto.createHash('sha256').update(mobileNumber).digest('hex');
  }

  /**
   * Generate a random verification code (numeric)
   */
  generateVerificationCode(): string {
    const min = Math.pow(10, this.verificationCodeLength - 1);
    const max = Math.pow(10, this.verificationCodeLength) - 1;
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    return code.toString();
  }

  /**
   * Generate a random token (for refresh tokens, etc.)
   */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

