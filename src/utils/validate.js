const { z } = require('zod');
const { badRequest } = require('./error');

const emailField = z.string().trim().toLowerCase().email('A valid email is required');
const passwordField = z.string().min(8, 'Password must be at least 8 characters').max(128);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: emailField,
  password: passwordField,
});

const loginSchema = z.object({ email: emailField, password: z.string().min(1, 'Password is required') });

const tokenSchema = z.object({ token: z.string().min(32, 'A valid token is required') });

const resetSchema = tokenSchema.extend({ password: passwordField });

const schemas = {
  register: registerSchema,
  login: loginSchema,
  email: z.object({ email: emailField }),
  token: tokenSchema,
  reset: resetSchema,
};

const validate = (name) => (req, res, next) => {
  const result = schemas[name].safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    return next(badRequest('Validation failed', details));
  }
  req.body = result.data;
  return next();
};

module.exports = { validate };
