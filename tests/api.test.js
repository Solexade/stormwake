import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.js';

test('Vercel rejects removed wallet endpoints before opening cloud storage', async () => {
  for (const route of ['auth/challenge', 'auth/verify', 'arrival/challenge', 'arrival/verify']) {
    for (const url of ['/api/' + route, '/api/index?route=' + route]) {
      const response = {
        setHeader() {},
        end(body) { this.body = JSON.parse(body); }
      };
      await handler({url, method: 'POST', headers: {host: 'stormwake.example'}, body: {}}, response);
      assert.equal(response.statusCode, 410);
      assert.match(response.body.error, /removed/);
    }
  }
});
