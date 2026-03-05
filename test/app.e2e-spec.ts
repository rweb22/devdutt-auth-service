import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth Service (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWKS Endpoint', () => {
    it('/.well-known/jwks.json (GET) - should return public keys', () => {
      return request(app.getHttpServer())
        .get('/.well-known/jwks.json')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('keys');
          expect(Array.isArray(res.body.keys)).toBe(true);
          expect(res.body.keys.length).toBeGreaterThan(0);
          expect(res.body.keys[0]).toHaveProperty('kty', 'RSA');
          expect(res.body.keys[0]).toHaveProperty('use', 'sig');
          expect(res.body.keys[0]).toHaveProperty('alg', 'RS256');
          expect(res.body.keys[0]).toHaveProperty('kid');
          expect(res.body.keys[0]).toHaveProperty('n');
          expect(res.body.keys[0]).toHaveProperty('e');
        });
    });
  });

  describe('Authentication Flow', () => {
    const testUser = {
      username: `testuser_${Date.now()}`,
      mobileNumber: `98765${Math.floor(Math.random() * 100000)}`,
      password: 'TestPassword123!',
      fullName: 'Test User',
    };

    it('/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body).toHaveProperty('tokenType', 'Bearer');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('/auth/register (POST) - should fail with duplicate username', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('/auth/login (POST) - should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          mobileNumber: testUser.mobileNumber,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('expiresIn');
          expect(res.body).toHaveProperty('tokenType', 'Bearer');
        });
    });

    it('/auth/login (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          mobileNumber: testUser.mobileNumber,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/auth/profile (GET) - should get user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('username', testUser.username);
          expect(res.body).toHaveProperty('role');
          expect(res.body).toHaveProperty('accountStatus');
        });
    });

    it('/auth/profile (GET) - should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('/auth/refresh (POST) - should refresh access token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('/auth/profile (PUT) - should update user profile', () => {
      return request(app.getHttpServer())
        .put('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          fullName: 'Updated Test User',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('fullName', 'Updated Test User');
        });
    });

    it('/auth/logout (POST) - should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(204);
    });
  });

  describe('Mobile Verification', () => {
    const testMobile = `98765${Math.floor(Math.random() * 100000)}`;

    it('/auth/mobile/verify/send (POST) - should send verification code', () => {
      return request(app.getHttpServer())
        .post('/auth/mobile/verify/send')
        .send({
          mobileNumber: testMobile,
          purpose: 'REGISTRATION',
        })
        .expect(204);
    });
  });
});
