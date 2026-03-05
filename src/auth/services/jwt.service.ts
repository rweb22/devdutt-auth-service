import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { exportJWK, importPKCS8, importSPKI } from 'jose';
import * as fs from 'fs';
import * as path from 'path';

export interface JwtPayload {
  sub: string; // username
  role: string;
  iat?: number;
  exp?: number;
}

export interface JWK {
  kty: string;
  use: string;
  alg: string;
  kid: string;
  n: string;
  e: string;
}

@Injectable()
export class CustomJwtService {
  private readonly logger = new Logger(CustomJwtService.name);
  private privateKey: string;
  private publicKey: string;
  private readonly accessTokenExpiry: number;
  private readonly refreshTokenExpiry: number;
  private readonly issuer: string;

  constructor(
    private configService: ConfigService,
    private jwtService: NestJwtService,
  ) {
    this.accessTokenExpiry = this.configService.get<number>('JWT_ACCESS_EXPIRES_IN', 3600);
    this.refreshTokenExpiry = this.configService.get<number>('JWT_REFRESH_EXPIRES_IN', 604800);
    this.issuer = this.configService.get<string>('JWT_ISSUER', 'devdutt-auth-service');
    this.loadKeys();
  }

  /**
   * Load RSA keys from filesystem
   */
  private loadKeys() {
    try {
      const privateKeyPath = this.configService.get<string>('JWT_PRIVATE_KEY_PATH', './keys/private.pem');
      const publicKeyPath = this.configService.get<string>('JWT_PUBLIC_KEY_PATH', './keys/public.pem');

      this.privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf8');
      this.publicKey = fs.readFileSync(path.resolve(publicKeyPath), 'utf8');

      this.logger.log('RSA keys loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load RSA keys', error);
      throw new Error('Failed to load RSA keys. Please generate them first.');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      keyid: 'devdutt-key-1',
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      privateKey: this.privateKey,
      algorithm: 'RS256',
      expiresIn: this.refreshTokenExpiry,
      issuer: this.issuer,
      keyid: 'devdutt-key-1',
    });
  }

  /**
   * Verify and decode a token
   */
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      publicKey: this.publicKey,
      algorithms: ['RS256'],
      issuer: this.issuer,
    });
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key distribution
   */
  async getJwks(): Promise<{ keys: JWK[] }> {
    try {
      // Import the public key
      const publicKeyObject = await importSPKI(this.publicKey, 'RS256');

      // Export as JWK
      const jwk = await exportJWK(publicKeyObject);

      // Add required fields
      const jwkWithMetadata: JWK = {
        kty: jwk.kty!,
        use: 'sig',
        alg: 'RS256',
        kid: 'devdutt-key-1',
        n: jwk.n!,
        e: jwk.e!,
      };

      return {
        keys: [jwkWithMetadata],
      };
    } catch (error) {
      this.logger.error('Failed to generate JWKS', error);
      throw new Error('Failed to generate JWKS');
    }
  }

  /**
   * Get access token expiry in seconds
   */
  getAccessTokenExpiry(): number {
    return this.accessTokenExpiry;
  }

  /**
   * Get refresh token expiry in seconds
   */
  getRefreshTokenExpiry(): number {
    return this.refreshTokenExpiry;
  }
}

