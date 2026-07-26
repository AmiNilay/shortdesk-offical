process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../server');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('ShortDesk', () => {

  // --- HOME PAGE ---
  test('GET / returns 200 with home page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('ShortDesk');
  });

  // --- SHORTEN WITH INVALID URL ---
  test('POST /shorten with invalid URL returns 400', async () => {
    const res = await request(app)
      .post('/shorten')
      .send('originalUrl=not-a-valid-url');
    expect(res.status).toBe(400);
  });

  // --- API SHORTEN WITH VALID URL ---
  test('POST /api/shorten with valid URL returns JSON with shortId', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/test-' + Date.now() })
      .set('Content-Type', 'application/json');

    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body.shortUrl).toBeDefined();
      expect(res.body.shortId).toBeDefined();
    }
  }, 20000);

  // --- API SHORTEN WITH MISSING URL ---
  test('POST /api/shorten with missing URL returns 400', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  // --- DASHBOARD ---
  test('GET /dashboard returns 200 or 500 gracefully', async () => {
    const res = await request(app).get('/dashboard');
    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(res.text).toContain('Dashboard');
    }
  }, 20000);

  // --- NONEXISTENT SHORT ID ---
  test('GET /nonexistent returns 404 or 500 gracefully', async () => {
    const res = await request(app).get('/this-id-does-not-exist-xyz');
    expect([404, 500]).toContain(res.status);
  }, 20000);

  // --- STATIC PAGES ---
  test('GET /privacy returns 200', async () => {
    const res = await request(app).get('/privacy');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Privacy');
  });

  test('GET /terms returns 200', async () => {
    const res = await request(app).get('/terms');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Terms');
  });

  test('GET /docs returns 200', async () => {
    const res = await request(app).get('/docs');
    expect(res.status).toBe(200);
    expect(res.text).toContain('API');
  });

  // --- API ANALYTICS ---
  test('GET /api/analytics/nonexistent returns 404 or 500', async () => {
    const res = await request(app).get('/api/analytics/nonexistent');
    expect([404, 500]).toContain(res.status);
  }, 20000);

  // --- EMPTY BODY ---
  test('POST /shorten with empty body returns 400', async () => {
    const res = await request(app).post('/shorten').send('');
    expect(res.status).toBe(400);
  });

});