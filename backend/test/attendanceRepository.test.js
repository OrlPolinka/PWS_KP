const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const database = require('../src/config/database');
const { AttendanceRepository } = require('../src/repositories/attendanceRepository');

const originalGetTransactionClient = database.getTransactionClient;

afterEach(() => {
  database.getTransactionClient = originalGetTransactionClient;
});

function installFakeClient(attendance, options = {}) {
  const calls = [];
  const client = {
    async query(text, params) {
      calls.push({ text, params });
      if (text.startsWith('SELECT a.*, b.id AS booking_id')) {
        return { rows: [attendance], rowCount: 1 };
      }
      if (text.startsWith('UPDATE memberships')) {
        return { rows: [], rowCount: options.noVisits ? 0 : 1 };
      }
      if (text.startsWith('UPDATE attendance')) {
        return { rows: [{ id: 8, is_present: params[0] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {
      calls.push({ text: 'RELEASE' });
    },
  };
  database.getTransactionClient = async () => client;
  return calls;
}

test('update corrects an automatic no-show and debits one membership visit', async () => {
  const calls = installFakeClient({
    id: 8,
    is_present: false,
    attendance_open: true,
    remaining_visits: 3,
    visit_count: 10,
    membership_id: 'membership-id',
    booking_id: 'booking-id',
  });

  const result = await AttendanceRepository.update(8, 'trainer-id', { is_present: true });

  const debit = calls.find((call) => call.text.startsWith('UPDATE memberships'));
  assert.equal(debit.params[0], 'membership-id');
  assert.equal(result.is_present, true);
  assert.equal(
    calls.some((call) => call.text.startsWith('UPDATE bookings') && call.params[0] === 'attended'),
    true
  );
  assert.equal(calls.some((call) => call.text === 'COMMIT'), true);
});

test('update restores a visit when a present mark is changed to no-show', async () => {
  const calls = installFakeClient({
    id: 8,
    is_present: true,
    attendance_open: true,
    remaining_visits: 4,
    visit_count: 10,
    membership_id: 'membership-id',
    booking_id: 'booking-id',
  });

  await AttendanceRepository.update(8, 'trainer-id', { is_present: false });

  const restore = calls.find((call) => call.text.startsWith('UPDATE memberships'));
  assert.equal(restore.params[0], 'membership-id');
  assert.equal(restore.params[1], 10);
  assert.equal(calls.some((call) => call.text.includes('LEAST(remaining_visits + 1')), true);
});

test('update rolls back when a corrected attendance cannot debit a visit', async () => {
  const calls = installFakeClient({
    id: 8,
    is_present: false,
    attendance_open: true,
    remaining_visits: 0,
    visit_count: 10,
    membership_id: 'membership-id',
    booking_id: 'booking-id',
  }, { noVisits: true });

  await assert.rejects(
    AttendanceRepository.update(8, 'trainer-id', { is_present: true }),
    /No remaining visits/
  );

  assert.equal(calls.some((call) => call.text.startsWith('UPDATE attendance')), false);
  assert.equal(calls.some((call) => call.text === 'ROLLBACK'), true);
  assert.equal(calls.at(-1).text, 'RELEASE');
});

test('update refuses to change attendance after the three-hour window', async () => {
  const calls = installFakeClient({
    id: 8,
    is_present: false,
    attendance_open: false,
    remaining_visits: 3,
    visit_count: 10,
    membership_id: 'membership-id',
    booking_id: 'booking-id',
  });

  await assert.rejects(
    AttendanceRepository.update(8, 'trainer-id', { is_present: true }),
    /Прошло более 3 часов/
  );
  assert.equal(calls.some((call) => call.text.startsWith('UPDATE attendance')), false);
  assert.equal(calls.some((call) => call.text === 'ROLLBACK'), true);
});
