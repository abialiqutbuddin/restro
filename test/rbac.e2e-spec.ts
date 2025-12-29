import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('RBAC (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/auth/signup (POST) - should create a user', async () => {
        const email = `testuser_${Date.now()}@example.com`;
        return request(app.getHttpServer())
            .post('/auth/signup')
            .send({
                email,
                password: 'password123',
                name: 'Test User',
            })
            .expect(201)
            .expect((res: any) => {
                expect(res.body.user).toHaveProperty('id');
                expect(res.body.user.email).toEqual(email);
                expect(res.body.user.role).toEqual('USER');
            });
    });

    it('/auth/login (POST) - should login and return token', async () => {
        const email = `loginuser_${Date.now()}@example.com`;
        // Create user first
        await request(app.getHttpServer())
            .post('/auth/signup')
            .send({
                email,
                password: 'password123',
            });

        return request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email,
                password: 'password123',
            })
            .expect(201) // Depending on implementation default for Post might be 201
            .expect((res: any) => {
                expect(res.body).toHaveProperty('access_token');
                expect(res.body.user.role).toEqual('USER');
            });
    });

    it('/auth/profile (GET) - should return user profile with valid token', async () => {
        const email = `profileuser_${Date.now()}@example.com`;
        // Create user
        await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email, password: 'password123' });

        // Login
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password: 'password123' });

        const token = loginRes.body.access_token;

        return request(app.getHttpServer())
            .get('/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((res: any) => {
                expect(res.body.email).toEqual(email);
                expect(res.body.role).toEqual('USER');
            });
    });

    it('/auth/profile (GET) - should fail without token', async () => {
        return request(app.getHttpServer())
            .get('/auth/profile')
            .expect(401);
    });
});
