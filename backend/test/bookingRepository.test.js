const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const database = require('../src/config/database');
const { BookingRepository } = require('../src/repositories/bookingRepository');

const originalGetTransactionClient = database.getTransactionClient;

afterEach(() => {
  database.getTransactionClient = originalGetTransactionClient;
});

function installFakeClient(rows, options = {}) {
  const calls = [];
  const client = {
    async query(text, params) {
      calls.push({ text, params });
      if (text.startsWith('SELECT b.id, s.trainer_id')) return { rows, rowCount: rows.length };
      if (text.startsWith('INSERT INTO attendance')) {
        return { rows: [], rowCount: options.insertConflict ? 0 : 1 };
      }
      if (text.startsWith('UPDATE bookings')) {
        if (options.failUpdate) throw new Error('simulated update failure');
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      calls.push({ text: 'RELEASE' });
    },
  };
  database.getTransactionClient = async () => client;
  return calls;
}

test('markPastBookingsAsNoShow inserts a no-show attendance row and commits each eligible booking', async () => {
  const calls = installFakeClient([
    { id: 'booking-1', trainer_id: 'trainer-1' },
    { id: 'booking-2', trainer_id: 'trainer-2' },
  ]);

  const updated = await BookingRepository.markPastBookingsAsNoShow();

  assert.equal(updated, 2);
  assert.equal(calls.filter((call) => call.text.startsWith('INSERT INTO attendance')).length, 2);
  assert.equal(calls.filter((call) => call.text.startsWith('UPDATE bookings')).length, 2);
  assert.equal(calls.filter((call) => call.text === 'COMMIT').length, 1);
  assert.equal(calls.some((call) => call.text.includes('FOR UPDATE OF b SKIP LOCKED')), true);
  assert.equal(calls.some((call) => call.text.includes("b.class_end + INTERVAL '3 hours' <= NOW()")), true);
  assert.equal(calls.at(-1).text, 'RELEASE');
});

test('markAttendanceByIdentifier rejects after the three-hour attendance window', async () => {
  const calls = [];
  database.getTransactionClient = async () => ({
    async query(text) {
      calls.push(text);
      if (text.trimStart().startsWith('SELECT b.id AS booking_id')) {
        return {
          rows: [{ booking_status: 'booked', attendance_open: false }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });

  await assert.rejects(
    BookingRepository.markAttendanceByIdentifier('schedule-id', '2026-11-25', 'CL-123', 'trainer-user-id', true),
    /Прошло более 3 часов/
  );
  assert.equal(calls.some((text) => text.startsWith('INSERT INTO attendance')), false);
  assert.equal(calls.includes('ROLLBACK'), true);
});

test('markAttendanceByIdentifier debits a limited membership for a present client', async () => {
  const calls = [];
  database.getTransactionClient = async () => ({
    async query(text) {
      calls.push(text);
      if (text.trimStart().startsWith('SELECT b.id AS booking_id')) {
        return {
          rows: [{
            booking_id: 'booking-id',
            booking_status: 'booked',
            attendance_open: true,
            client_id: 'client-id',
            client_name: 'Client',
            client_code: 'CL-123',
            membership_id: 'membership-id',
            membership_name: '10 занятий',
            remaining_visits: 3,
            trainer_id: 'trainer-id',
          }],
          rowCount: 1,
        };
      }
      if (text.startsWith('UPDATE memberships')) {
        return { rows: [{ remaining_visits: 2 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  });

  const result = await BookingRepository.markAttendanceByIdentifier(
    'schedule-id',
    '2026-11-25',
    'CL-123',
    'trainer-user-id',
    true
  );

  assert.equal(result.remaining_visits, 2);
  assert.equal(calls.some((text) => text.startsWith('UPDATE memberships')), true);
});

test('markPastBookingsAsNoShow skips a booking if attendance already exists', async () => {
  const calls = installFakeClient([{ id: 'booking-1', trainer_id: 'trainer-1' }], { insertConflict: true });

  const updated = await BookingRepository.markPastBookingsAsNoShow();

  assert.equal(updated, 0);
  assert.equal(calls.some((call) => call.text.startsWith('UPDATE bookings')), false);
  assert.equal(calls.some((call) => call.text === 'COMMIT'), true);
});

test('markPastBookingsAsNoShow rolls back and releases the client when a write fails', async () => {
  const calls = installFakeClient([{ id: 'booking-1', trainer_id: 'trainer-1' }], { failUpdate: true });

  await assert.rejects(BookingRepository.markPastBookingsAsNoShow(), /simulated update failure/);

  assert.equal(calls.some((call) => call.text === 'ROLLBACK'), true);
  assert.equal(calls.at(-1).text, 'RELEASE');
});
