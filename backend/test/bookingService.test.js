const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const {
  BookingRepository,
  MembershipRepository,
  ScheduleRepository,
  UserRepository,
} = require('../src/repositories');
const { BookingService } = require('../src/services/bookingService');

const originalMethods = new Map();

function stub(target, method, implementation) {
  const key = `${target.constructor.name}.${method}`;
  if (!originalMethods.has(key)) {
    originalMethods.set(key, { target, method, original: target[method] });
  }
  target[method] = implementation;
}

afterEach(() => {
  for (const { target, method, original } of originalMethods.values()) {
    target[method] = original;
  }
  originalMethods.clear();
});

function nextWeekday(weekday) {
  const date = new Date();
  const today = date.getUTCDay() || 7;
  let offset = (weekday - today + 7) % 7;
  if (offset === 0) offset = 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function setupBooking(overrides = {}) {
  const classDate = overrides.class_date || nextWeekday(1);
  const classDay = new Date(`${classDate}T00:00:00Z`).getUTCDay() || 7;
  const data = {
    schedule_id: 'schedule-id',
    client_id: 'client-id',
    membership_id: 'membership-id',
    class_date: classDate,
    ...overrides,
  };
  const schedule = {
    id: 'schedule-id',
    day_of_week: classDay,
    start_time: '23:59:00',
    end_time: '23:59:59',
    status: 'scheduled',
    dance_style_id: 7,
    ...overrides.schedule,
  };
  const membership = {
    client_id: data.client_id,
    status: 'active',
    date_valid: true,
    visits_valid: true,
    style_valid: true,
    ...overrides.membership,
  };
  const booking = { id: 'booking-id', status: 'booked' };
  const calls = { create: 0 };

  stub(UserRepository, 'findById', async () => ({ id: data.client_id, role: 'client' }));
  stub(ScheduleRepository, 'findById', async () => schedule);
  stub(ScheduleRepository, 'checkCapacity', async () => ({ current: 0, max: 10 }));
  stub(MembershipRepository, 'findForBooking', async () => membership);
  stub(BookingRepository, 'findByClientAndSchedule', async () => null);
  stub(BookingRepository, 'hasOverlappingBooking', async () => false);
  stub(BookingRepository, 'create', async (received) => {
    calls.create++;
    calls.data = received;
    return booking;
  });

  return { data, schedule, membership, booking, calls };
}

test('createBooking delegates a valid future booking and returns the saved row', async () => {
  const { data, booking, calls } = setupBooking();

  const result = await BookingService.createBooking(data);

  assert.equal(result, booking);
  assert.equal(calls.create, 1);
  assert.equal(calls.data, data);
});

test('createBooking rejects unknown or non-client users before accessing booking data', async () => {
  setupBooking();
  stub(UserRepository, 'findById', async () => null);
  await assert.rejects(BookingService.createBooking({}), /User not found/);

  stub(UserRepository, 'findById', async () => ({ id: 'trainer-id', role: 'trainer' }));
  await assert.rejects(BookingService.createBooking({}), /User must be a client/);
});

test('createBooking rejects invalid calendar dates, a mismatched weekday, and unavailable schedules', async () => {
  const { data } = setupBooking();

  await assert.rejects(
    BookingService.createBooking({ ...data, class_date: '2026-02-30' }),
    /A valid class date is required/
  );
  await assert.rejects(
    BookingService.createBooking({ ...data, class_date: nextWeekday(2) }),
    /Selected date does not match the weekly class day/
  );

  stub(ScheduleRepository, 'findById', async () => ({ status: 'cancelled' }));
  await assert.rejects(BookingService.createBooking(data), /Cannot book a cancelled or completed class/);
});

test('createBooking rejects a class that has already started', async () => {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 7);
  const classDate = yesterday.toISOString().slice(0, 10);
  const classDay = new Date(`${classDate}T00:00:00Z`).getUTCDay() || 7;
  const { data } = setupBooking({
    class_date: classDate,
    schedule: { day_of_week: classDay, start_time: '00:00:00' },
  });

  await assert.rejects(BookingService.createBooking(data), /Cannot book a class in the past/);
});

test('createBooking rejects memberships that are inactive, out of date, depleted, or for another style', async (t) => {
  const cases = [
    [{ status: 'paused' }, /Membership is not active/],
    [{ date_valid: false }, /Membership is not valid/],
    [{ visits_valid: false }, /No remaining visits/],
    [{ style_valid: false }, /does not cover this dance style/],
  ];

  for (const [membership, expectedError] of cases) {
    await t.test(expectedError.source, async () => {
      const { data } = setupBooking({ membership });
      await assert.rejects(BookingService.createBooking(data), expectedError);
    });
    for (const { target, method, original } of originalMethods.values()) {
      target[method] = original;
    }
    originalMethods.clear();
  }
});

test('createBooking prevents duplicate, overlapping, and over-capacity bookings', async (t) => {
  const cases = [
    {
      configure: () => stub(BookingRepository, 'findByClientAndSchedule', async () => ({ status: 'booked' })),
      error: /Already booked for this class/,
    },
    {
      configure: () => stub(BookingRepository, 'hasOverlappingBooking', async () => true),
      error: /already have a booking that overlaps/,
    },
    {
      configure: () => stub(ScheduleRepository, 'checkCapacity', async () => ({ current: 10, max: 10 })),
      error: /Class is fully booked/,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.error.source, async () => {
      const { data, calls } = setupBooking();
      scenario.configure();
      await assert.rejects(BookingService.createBooking(data), scenario.error);
      assert.equal(calls.create, 0);
    });
    for (const { target, method, original } of originalMethods.values()) {
      target[method] = original;
    }
    originalMethods.clear();
  }
});

test('markAttendanceByIdentifier checks trainer ownership and class weekday, then normalizes the identifier', async () => {
  const classDate = nextWeekday(1);
  const schedule = { id: 'schedule-id', trainer_id: 'trainer-id', day_of_week: 1 };
  let received;
  stub(ScheduleRepository, 'findById', async () => schedule);
  stub(require('../src/repositories').TrainerRepository, 'findByUserId', async () => ({ id: 'trainer-id' }));
  stub(BookingRepository, 'markAttendanceByIdentifier', async (...args) => {
    received = args;
    return { is_present: true };
  });

  const result = await BookingService.markAttendanceByIdentifier(
    'schedule-id',
    classDate,
    '  CL-123  ',
    'trainer-user-id',
    true
  );

  assert.deepEqual(received, ['schedule-id', classDate, 'CL-123', 'trainer-user-id', true]);
  assert.equal(result.is_present, true);
  await assert.rejects(
    BookingService.markAttendanceByIdentifier('schedule-id', classDate, ' ', 'trainer-user-id', true),
    /Введите номер клиента/
  );
  await assert.rejects(
    BookingService.markAttendanceByIdentifier('schedule-id', classDate, 'CL-123', 'trainer-user-id', 'yes'),
    /Выберите, отметить ли клиента/
  );
});
