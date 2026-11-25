const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { ScheduleRepository } = require('../src/repositories/scheduleRepository');
const { ScheduleService } = require('../src/services/scheduleService');

const originalMethods = new Map();

function stub(method, implementation) {
  if (!originalMethods.has(method)) {
    originalMethods.set(method, ScheduleRepository[method]);
  }
  ScheduleRepository[method] = implementation;
}

afterEach(() => {
  for (const [method, original] of originalMethods) {
    ScheduleRepository[method] = original;
  }
  originalMethods.clear();
});

test('createSchedule validates linked hall, trainer, and style before conflict checks', async () => {
  const calls = [];
  stub('validateAssignments', async (data) => calls.push(['validate', data]));
  stub('hasConflict', async () => {
    calls.push(['conflict']);
    return true;
  });
  stub('create', async () => {
    calls.push(['create']);
    return {};
  });

  const data = {
    trainer_id: 'trainer-id',
    hall_id: 3,
    dance_style_id: 7,
    day_of_week: 2,
    start_time: '18:00',
    end_time: '19:00',
    max_capacity: 8,
    created_by: 'admin-id',
  };

  await assert.rejects(ScheduleService.createSchedule(data), /Тренер или зал уже занят/);
  assert.deepEqual(calls, [['validate', data], ['conflict']]);
});

test('updateSchedule validates the merged assignment and new capacity', async () => {
  const existing = {
    id: 'schedule-id',
    trainer_id: 'trainer-id',
    hall_id: 3,
    dance_style_id: 7,
    day_of_week: 2,
    start_time: '18:00',
    end_time: '19:00',
    max_capacity: 8,
  };
  let validatedAssignment;
  stub('findById', async () => existing);
  stub('validateAssignments', async (data) => { validatedAssignment = data; });
  stub('hasConflict', async () => false);
  stub('update', async () => ({ ...existing, max_capacity: 5 }));

  await ScheduleService.updateSchedule('schedule-id', { max_capacity: 5 });

  assert.deepEqual(validatedAssignment, {
    trainer_id: existing.trainer_id,
    hall_id: existing.hall_id,
    dance_style_id: existing.dance_style_id,
    max_capacity: 5,
  });
});
