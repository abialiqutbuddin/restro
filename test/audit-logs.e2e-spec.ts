import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { PrismaSerializeInterceptor } from './../src/common/prisma-serialize.interceptor';

describe('Audit Logs (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let authToken: string;
    let userId: string;
    let orderId: string;
    let magicLinkToken: string;

    const email = `audit_admin_${Date.now()}@test.com`;
    const password = 'password123';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalInterceptors(new PrismaSerializeInterceptor());
        await app.init();
        prisma = app.get<PrismaService>(PrismaService);

        // 1. Create Staff User (ADMIN)
        // Signup first
        const signupRes = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email, password, name: 'Audit Admin' });

        userId = signupRes.body.user.id;

        // Manually promote to ADMIN to ensure staff privileges if needed
        await prisma.users.update({
            where: { email },
            data: { role: 'ADMIN' },
        });

        // Login
        const loginRes = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password });

        authToken = loginRes.body.access_token;
    });

    afterAll(async () => {
        // Cleanup if necessary, though typical e2e tears down DB or we rely on unique data
        await app.close();
    });

    it('should log ORDER_CREATED when staff creates an order', async () => {
        const createRes = await request(app.getHttpServer())
            .post('/events')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                eventDate: new Date().toISOString(),
                customerName: 'Audit Test Client',
                status: 'incomplete',
            })
            .expect(201)
            .catch(err => {
                if (err.response) {
                    console.error('Create Event Error Response:', err.response.body);
                }
                throw err;
            });

        orderId = createRes.body.id; // Usually returns object with id (string/number)
        console.log('Created Order ID:', orderId, 'Response:', JSON.stringify(createRes.body, null, 2));

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(orderId), action: 'ORDER_CREATED' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('STAFF');
    });

    it('should log LINK_CREATED when staff generates a magic link', async () => {
        const genRes = await request(app.getHttpServer())
            .post('/magic-links/generate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ orderId: orderId, userId: userId })
            .expect(201);

        magicLinkToken = genRes.body.raw_token;
        console.log('Magic Link Token:', magicLinkToken, 'Response:', JSON.stringify(genRes.body, null, 2));

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(orderId), action: 'LINK_CREATED' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('STAFF');
    });

    it('should log LINK_ACCESSED when client validates token', async () => {
        await request(app.getHttpServer())
            .get(`/magic-links/validate/${magicLinkToken}`)
            .expect(200);

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(orderId), action: 'LINK_ACCESSED' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('CLIENT');
    });

    it('should log CLIENT_EDIT when client updates order', async () => {
        await request(app.getHttpServer())
            .patch(`/magic-links/update-order/${magicLinkToken}`)
            .send({
                headcountEst: 150,
                notes: 'Updated via audit test',
            })
            .expect(200);

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(orderId), action: 'CLIENT_EDIT' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('CLIENT');
        const metadata = logs[0].metadata as any;
        expect(metadata.changes.headcountEst).toBe(150);
    });

    it('should log ORDER_APPROVED when client approves order', async () => {
        const approveRes = await request(app.getHttpServer())
            .post(`/magic-links/approve/${magicLinkToken}`);
        console.log('Approve Response:', approveRes.status, approveRes.body);
        expect(approveRes.status).toBe(201);

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(orderId), action: 'ORDER_APPROVED' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('CLIENT');
    });

    it('should log CHANGE_REQUEST_CREATED when client requests changes on locked order', async () => {
        // Order is now locked from approval.
        await request(app.getHttpServer())
            .post(`/magic-links/change-request/${magicLinkToken}`)
            .send({
                changes: { notes: 'Need vegan options' },
                reason: 'Dietary requirements',
            })
            .expect(201);

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(orderId), action: 'CHANGE_REQUEST_CREATED' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('CLIENT');
        const metadata = logs[0].metadata as any;
        expect(metadata.reason).toBe('Dietary requirements');
    });

    it('should log ORDER_REJECTED when client rejects order (using fresh order)', async () => {
        // Create new order
        const createRes = await request(app.getHttpServer())
            .post('/events')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                eventDate: new Date().toISOString(),
                customerName: 'Reject Test Client',
                status: 'incomplete',
            });

        const newOrderId = createRes.body.id;

        // Generate link
        const genRes = await request(app.getHttpServer())
            .post('/magic-links/generate')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ orderId: newOrderId, userId: userId });

        const newToken = genRes.body.raw_token;

        // Reject
        await request(app.getHttpServer())
            .post(`/magic-links/reject/${newToken}`)
            .expect(201);

        // Verify Log
        const logs = await prisma.order_audit_logs.findMany({
            where: { order_id: BigInt(newOrderId), action: 'ORDER_REJECTED' },
        });

        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].actor_type).toBe('CLIENT');
    });
});
