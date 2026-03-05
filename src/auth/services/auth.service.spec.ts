import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { CustomJwtService } from './jwt.service';
import { CryptoService } from '../../common/services/crypto.service';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { VerificationCode } from '../../entities/verification-code.entity';
import { UserRole, AccountStatus } from '@devdutt/shared';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let verificationCodeRepository: Repository<VerificationCode>;
  let cryptoService: CryptoService;
  let jwtService: CustomJwtService;

  const mockUser: User = {
    username: 'testuser',
    mobileNumber: '9876543210',
    mobileNumberHash: 'hash123',
    mobileVerifiedAt: new Date(),
    passwordHash: 'hashedpassword',
    passwordChangedAt: null,
    role: UserRole.PUBLIC,
    accountStatus: AccountStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    verifiedAt: new Date(),
    fullName: 'Test User',
    dateOfBirth: null,
    sex: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VerificationCode),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: CryptoService,
          useValue: {
            hashPassword: jest.fn(),
            verifyPassword: jest.fn(),
            hashMobileNumber: jest.fn(),
            generateVerificationCode: jest.fn(),
          },
        },
        {
          provide: CustomJwtService,
          useValue: {
            generateAccessToken: jest.fn(),
            generateRefreshToken: jest.fn(),
            verifyToken: jest.fn(),
            getAccessTokenExpiry: jest.fn(),
            getRefreshTokenExpiry: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                MAX_LOGIN_ATTEMPTS: 5,
                ACCOUNT_LOCKOUT_DURATION: 900,
                VERIFICATION_CODE_EXPIRES_IN: 600,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
    verificationCodeRepository = module.get<Repository<VerificationCode>>(getRepositoryToken(VerificationCode));
    cryptoService = module.get<CryptoService>(CryptoService);
    jwtService = module.get<CustomJwtService>(CustomJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        username: 'newuser',
        mobileNumber: '9876543210',
        password: 'password123',
      };

      jest.spyOn(cryptoService, 'hashMobileNumber').mockReturnValue('hash123');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(cryptoService, 'hashPassword').mockResolvedValue('hashedpassword');
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as any);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'generateAccessToken').mockReturnValue('access-token');
      jest.spyOn(jwtService, 'generateRefreshToken').mockReturnValue('refresh-token');
      jest.spyOn(jwtService, 'getAccessTokenExpiry').mockReturnValue(3600);
      jest.spyOn(jwtService, 'getRefreshTokenExpiry').mockReturnValue(604800);
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue({} as any);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if mobile number already exists', async () => {
      const registerDto = {
        username: 'newuser',
        mobileNumber: '9876543210',
        password: 'password123',
      };

      jest.spyOn(cryptoService, 'hashMobileNumber').mockReturnValue('hash123');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        mobileNumber: '9876543210',
        password: 'password123',
      };

      jest.spyOn(cryptoService, 'hashMobileNumber').mockReturnValue('hash123');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(cryptoService, 'verifyPassword').mockResolvedValue(true);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);
      jest.spyOn(jwtService, 'generateAccessToken').mockReturnValue('access-token');
      jest.spyOn(jwtService, 'generateRefreshToken').mockReturnValue('refresh-token');
      jest.spyOn(jwtService, 'getAccessTokenExpiry').mockReturnValue(3600);
      jest.spyOn(jwtService, 'getRefreshTokenExpiry').mockReturnValue(604800);
      jest.spyOn(refreshTokenRepository, 'create').mockReturnValue({} as any);
      jest.spyOn(refreshTokenRepository, 'save').mockResolvedValue({} as any);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        mobileNumber: '9876543210',
        password: 'wrongpassword',
      };

      jest.spyOn(cryptoService, 'hashMobileNumber').mockReturnValue('hash123');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(cryptoService, 'verifyPassword').mockResolvedValue(false);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = {
        mobileNumber: '9876543210',
        password: 'password123',
      };

      jest.spyOn(cryptoService, 'hashMobileNumber').mockReturnValue('hash123');
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});

