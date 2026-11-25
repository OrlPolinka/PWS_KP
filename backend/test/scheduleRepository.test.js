const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const database = require('../src/config/database');
const { ScheduleRepository } = require('../src/repositories/scheduleRepository');

const originalQuery = database.query;

afterEach(() => {
  database.query = originalQuery;
});

function installAssignment(overrides = {}) {
  database.query = async () => ({
    rows: [{
      hall_capacity: 12,
      hall_active: true,
      style_name: 'Hip Hop',
      style_active: true,
      specialization: 'Hip Hop, Contemporary',
      trainer_active: true,
      trainer_role: 'trainer',
      ...overrides,
    }],
    rowCount: 1,
  });
}

test('validateAssignments accepts a listed trainer style within the hall capacity', async () => {
  installAssignment();

  await assert.doesNotReject(ScheduleRepository.validateAssignments({
    trainer_id: 'trainer-id',
    hall_id: 1,
    dance_style_id: 1,
    max_capacity: 10,
  }));
});

test('validateAssignments rejects a style outside the trainer specialization', async () => {
  installAssignment({ style_name: 'Salsa' });

  await assert.rejects(
    ScheduleRepository.validateAssignments({
      trainer_id: 'trainer-id',
      hall_id: 1,
      dance_style_id: 2,
      max_capacity: 10,
    }),
    /Тренер не ведёт направление/
  );
});

test('validateAssignments rejects class capacity above the selected hall capacity', async () => {
  installAssignment();

  await assert.rejects(
    ScheduleRepository.validateAssignments({
      trainer_id: 'trainer-id',
      hall_id: 1,
      dance_style_id: 1,
      max_capacity: 13,
    }),
    /не может превышать вместимость зала/
  );
});
