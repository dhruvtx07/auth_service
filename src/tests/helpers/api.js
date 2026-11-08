const request = require('supertest');
const { createApp } = require('../../app');
const { ok } = require('../../utils/response');

const app = createApp();
const BASE = '/api/v1';

const post = (url, body = {}, cookie = null) => {
  const req = request(app).post(`${BASE}${url}`);
  if (cookie) req.set('Cookie', cookie);
  return req.send(body);
};

const get = (url, cookie = null) => {
  const req = request(app).get(`${BASE}${url}`);
  if (cookie) req.set('Cookie', cookie);
  return req;
};

/** Pulls a single cookie out of a supertest response ("name=value" form). */
const extractCookie = (res, name) => {
  const header = res.headers['set-cookie'] || [];
  const found = header.find((entry) => entry.startsWith(`${name}=`));
  return found ? found.split(';')[0] : null;
};

const assertSuccess = (res, status = 200) => {
  expect(res.status).toBe(status);
  expect(res.body.success).toBe(true);
  expect(res.body.meta.timestamp).toBeTruthy();
  return res.body;
};

const assertError = (res, status, code = undefined) => {
  expect(res.status).toBe(status);
  expect(res.body.success).toBe(false);
  if (code) expect(res.body.error.code).toBe(code);
  return res.body;
};

module.exports = { post, get, extractCookie, assertSuccess, assertError, ok };
