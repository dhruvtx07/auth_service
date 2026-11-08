const { resetDatabase } = require('./helpers/db');
const { post, assertSuccess } = require('./helpers/api');
const { createVerifiedUser, login } = require('./helpers/fixtures');
const { sequelize } = require('../config/database');

/** Reads the most recent audit rows for one audit table (DB triggers write these). */
const latestAuditRows = async (table, limit = 10) =>
  sequelize.query(`SELECT * FROM \`${table}\` ORDER BY id DESC LIMIT ${limit}`, { type: sequelize.QueryTypes.SELECT });

const parse = (jsonText) => (typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText);

beforeEach(resetDatabase);

describe('database triggers → dedicated audit tables (DB-owned auditing)', () => {
  it('AFTER UPDATE trigger: login touches the user → users_audit row with old + new values', async () => {
    const user = await createVerifiedUser();
    await login(user);

    // verify-email already issued session #1 (touchLastLogin); login re-issued session #2.
    // The FIRST ever touch (old=null → new=timestamp) is the canonical 'update' proof.
    const rows = await latestAuditRows('users_audit', 20);
    const firstTouch = rows
      .map((row) => ({ row, old: parse(row.old_values), new: parse(row.new_values) }))
      .find((entry) => entry.old.last_login_at === null && entry.new.last_login_at);

    expect(firstTouch).toBeTruthy();
    expect(firstTouch.row.action).toBe('update');
    expect(firstTouch.old.email).toBe(user.email);              // old state present
    expect(firstTouch.new.last_login_at).toBeTruthy();          // new state present
    expect(firstTouch.old.created_at).toBeTruthy();
  });

  it('AFTER UPDATE trigger: refresh rotation → refresh_tokens_audit revocation rows', async () => {
    const user = await createVerifiedUser();
    const { refreshCookie } = await login(user);

    assertSuccess(await post('/auth/refresh', {}, refreshCookie)); // rotates → revokes old token

    const rows = await latestAuditRows('refresh_tokens_audit');
    const revoked = rows.find((row) => parse(row.new_values).revokedAt || parse(row.new_values).revoked_at);

    expect(revoked).toBeTruthy();
    expect(parse(revoked.old_values).revoked_at).toBeFalsy(); // was live before rotation
  });

  it('AFTER DELETE trigger: resend-verification invalidates the pending token → email_tokens_audit row with old values', async () => {
    // The user must be UNVERIFIED for resend to actually (re)send + invalidate the pending token
    await post('/auth/register', { name: 'Pending One', email: 'pending.one@example.com', password: 'Password123!' });

    assertSuccess(await post('/auth/resend-verification', { email: 'pending.one@example.com' }));

    const rows = await latestAuditRows('email_tokens_audit');
    const deleted = rows.find((row) => row.action === 'delete');

    expect(deleted).toBeTruthy();
    expect(parse(deleted.old_values).type).toBe('verify');
    expect(deleted.new_values).toBeFalsy(); // delete rows carry no new state
  });

  it('audit tables survive record deletion (no FK on audit rows)', async () => {
    const user = await createVerifiedUser();
    const { refreshCookie } = await login(user);
    await post('/auth/logout', {}, refreshCookie);

    const { User } = require('../models');
    const row = await User.findOne({ where: { email: user.email } });
    await User.destroy({ where: { id: row.id } });

    const rows = await latestAuditRows('users_audit');
    const deleted = rows.find((row2) => row2.action === 'delete' && row2.record_id === Number(row.id));

    expect(deleted).toBeTruthy();
    expect(parse(deleted.old_values).email).toBe(user.email);
  });
});
