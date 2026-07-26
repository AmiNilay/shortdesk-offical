const request = require('supertest');
const app = require('../server');

describe('ShortDesk', () => {

  test('GET / returns 200 with home page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('ShortDesk');
  });

  test('POST /shorten with invalid URL returns 400', async () => {
    const res = await request(app)
      .post('/shorten')
      .send('originalUrl=not-a-url');
    expect(res.status).toBe(400);
  });

  test('POST /api/shorten with valid URL returns JSON with shortId', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({ url: 'https://example.com/test-' + Date.now() })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body.shortUrl).toBeDefined();
    expect(res.body.shortId).toBeDefined();
  });

  test('POST /api/shorten with missing URL returns 400', async () => {
    const res = await request(app)
      .post('/api/shorten')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
  });

  test('GET /dashboard returns 200', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Dashboard');
  });

  test('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/this-id-does-not-exist-xyz');
    expect(res.status).toBe(404);
  });
});