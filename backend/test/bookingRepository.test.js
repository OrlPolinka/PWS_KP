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
  assert.equal(calls.at(-1).text, 'RELEASE');
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
