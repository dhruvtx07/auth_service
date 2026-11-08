/**
 * Proof that every clock in the stack is pinned to the same UTC timeline.
 * Rows are created 4 different ways; all timestamps must match (within jitter).
 */
const { sequelize } = require('../src/config/database');
const { User, createUser, updateProfile } = require('../src/models/user.model');

const fmt = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v?.toISOString?.() ?? v]));

(async () => {
  await sequelize.authenticate();

  // pre-clean leftovers from interrupted runs
  await sequelize.query("DELETE FROM users_audit WHERE record_id IN (SELECT id FROM users WHERE email LIKE 'utc-proof-%')");
  await sequelize.query("DELETE FROM users WHERE email LIKE 'utc-proof-%'");

  // 0. Sanity: session timezone forced by the driver
  const [[{ tz }]] = await sequelize.query("SELECT @@session.time_zone AS tz");
  const [[{ now_sql, same_clock }]] = await sequelize.query("SELECT NOW() AS now_sql, UTC_TIMESTAMP() AS utc, (NOW() = UTC_TIMESTAMP()) AS same_clock");
  console.log(`session time_zone: ${tz}`);  console.log(`DB NOW() vs UTC_TIMESTAMP(): ${now_sql instanceof Date ? now_sql.toISOString() : now_sql} (identical: ${same_clock})`);

  // 1. Node clock (Sequelize auto created_at)  2. DB default (omit column)  3. SQL NOW()
  const viaNode = await createUser({ email: `utc-proof-node@example.com`, name: 'node' });
  await sequelize.query("INSERT INTO users (email, name) VALUES ('utc-proof-default@example.com', 'default')");
  await sequelize.query("INSERT INTO users (email, name, created_at) VALUES ('utc-proof-now@example.com', 'now', NOW())");

  // 4. Audit trigger timestamp — trigger uses DEFAULT CURRENT_TIMESTAMP
  await updateProfile(viaNode.id, { name: 'renamed-by-utc-proof' });
  const auditRows = await sequelize.query("SELECT created_at FROM users_audit WHERE record_id = ? AND action = 'update' ORDER BY id DESC LIMIT 1", { replacements: [viaNode.id], type: sequelize.QueryTypes.SELECT });
  console.log(`audit rows found: ${auditRows.length}`, auditRows[0]);
  const audit = auditRows[0] || {};

  const rows = await sequelize.query("SELECT email, created_at, updated_at, NOW() AS db_now FROM users WHERE email LIKE 'utc-proof-%'", { type: sequelize.QueryTypes.SELECT });
  console.table(rows.map(fmt));

  const times = [...rows.flatMap((r) => [r.created_at, r.updated_at]), new Date(audit.created_at || 0), new Date(now_sql)].map(Number);
  const jitter = Math.max(...times) - Math.min(...times);
  console.log(`viaNode: id=${viaNode?.id} createdAt=${viaNode?.createdAt} createdAtIso=${viaNode?.get?.('createdAt')?.toISOString?.()}`);
  console.log(`node row:               ${viaNode.createdAt.toISOString()}`);
  console.log(`audit trigger row:      ${audit.created_at ? new Date(audit.created_at).toISOString() : '(missing)'}`);
  console.log(`NOW() returned by DB:   ${new Date(now_sql).toISOString()}`);
  console.log(jitter <= 1500 ? `✅ ALL CLOCKS AGREE — max drift ${jitter}ms` : `❌ MISMATCH — drift ${jitter}ms`);

  // cleanup
  await sequelize.query("DELETE FROM users_audit WHERE record_id = ?", { replacements: [viaNode.id] });
  await sequelize.query("DELETE FROM users WHERE email LIKE 'utc-proof-%'");
  await sequelize.close();
})().catch((err) => { console.error('❌ FAILED:', err.message); process.exit(1); });
