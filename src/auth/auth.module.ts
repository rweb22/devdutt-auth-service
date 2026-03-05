import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { VerificationCode } from '../entities/verification-code.entity';
import { AuthService } from './services/auth.service';
import { CustomJwtService } from './services/jwt.service';
import { CryptoService } from '../common/services/crypto.service';
import { AuthController } from './controllers/auth.controller';
import { JwksController } from './controllers/jwks.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, VerificationCode]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('JWT_ACCESS_EXPIRES_IN', 3600),
        },
      }),
    }),
  ],
  controllers: [AuthController, JwksController],
  providers: [
    AuthService,
    CustomJwtService,
    CryptoService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, CustomJwtService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

