const buildMeta = (req) => ({
  timestamp: new Date().toISOString(),
  path: req.originalUrl,
});

const send = (req, res, status, body) => {
  res.status(status).json({ ...body, meta: buildMeta(req) });
};

const ok = (req, res, { data = null, message = 'Success', status = 200 } = {}) =>
  send(req, res, status, { success: true, message, data });

const fail = (req, res, { status, message, code, details = null }) =>
  send(req, res, status, { success: false, message, error: { code, message, details } });

const created = (req, res, { data = null, message = 'Resource created' } = {}) =>
  ok(req, res, { data, message, status: 201 });

module.exports = { ok, created, fail };
