const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
const TOKEN_BYTES = 32;

const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

const comparePassword = (plainPassword, passwordHash) => bcrypt.compare(plainPassword, passwordHash);

const randomToken = () => crypto.randomBytes(TOKEN_BYTES).toString('hex');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

module.exports = { hashPassword, comparePassword, randomToken, sha256 };
