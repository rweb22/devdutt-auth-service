import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                BCRYPT_ROUNDS: 10,
                VERIFICATION_CODE_LENGTH: 6,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testpassword123';
      const hash = await service.hashPassword(password);
      const isValid = await service.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await service.hashPassword(password);
      const isValid = await service.verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('hashMobileNumber', () => {
    it('should hash a mobile number', () => {
      const mobileNumber = '9876543210';
      const hash = service.hashMobileNumber(mobileNumber);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(mobileNumber);
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    it('should produce consistent hashes for the same mobile number', () => {
      const mobileNumber = '9876543210';
      const hash1 = service.hashMobileNumber(mobileNumber);
      const hash2 = service.hashMobileNumber(mobileNumber);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different mobile numbers', () => {
      const mobile1 = '9876543210';
      const mobile2 = '9876543211';
      const hash1 = service.hashMobileNumber(mobile1);
      const hash2 = service.hashMobileNumber(mobile2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate a 6-digit code', () => {
      const code = service.generateVerificationCode();

      expect(code).toBeDefined();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes on multiple calls', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(service.generateVerificationCode());
      }

      // Should have generated at least some different codes
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('generateRandomToken', () => {
    it('should generate a random token', () => {
      const token = service.generateRandomToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate different tokens on multiple calls', () => {
      const token1 = service.generateRandomToken();
      const token2 = service.generateRandomToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of specified length', () => {
      const token = service.generateRandomToken(16);

      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });
  });
});

