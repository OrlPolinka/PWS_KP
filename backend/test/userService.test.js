const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { UserRepository } = require('../src/repositories');
const { UserService } = require('../src/services/userService');

const originalMethods = new Map();

function stub(target, method, implementation) {
  if (!originalMethods.has(method)) {
    originalMethods.set(method, { target, method, original: target[method] });
  }
  target[method] = implementation;
}

afterEach(() => {
  for (const { target, method, original } of originalMethods.values()) {
    target[method] = original;
  }
  originalMethods.clear();
});

test('getPublicUserById returns contact details without credentials or QR secrets', async () => {
  stub(UserRepository, 'findById', async () => ({
    id: 'client-id',
    email: 'client@example.com',
    role: 'client',
    full_name: 'Client Name',
    phone: '+1234567890',
    photo_url: '/uploads/client.jpg',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    password_hash: 'secret-hash',
    qr_token: 'private-qr-token',
    client_code: 'CL-000001',
  }));

  const result = await UserService.getPublicUserById('client-id');

  assert.deepEqual(Object.keys(result).sort(), [
    'created_at',
    'email',
    'full_name',
    'id',
    'is_active',
    'phone',
    'photo_url',
    'role',
  ]);
  assert.equal(result.phone, '+1234567890');
});

test('updateMyProfile normalizes email and phone before saving', async () => {
  const user = { id: 'client-id', email: 'old@example.com', password_hash: 'unchanged-hash' };
  let saved;
  stub(UserRepository, 'findById', async () => user);
  stub(UserRepository, 'findByEmail', async () => null);
  stub(UserRepository, 'update', async (_id, data) => {
    saved = data;
    return { ...user, ...data };
  });

  await UserService.updateMyProfile('client-id', {
    full_name: '  Client Name ',
    email: ' CLIENT@EXAMPLE.COM ',
    phone: '+1 (202) 555-0123',
  });

  assert.equal(saved.full_name, 'Client Name');
  assert.equal(saved.email, 'client@example.com');
  assert.equal(saved.phone, '+12025550123');
});

test('updateMyProfile rejects invalid contacts and duplicate email before saving', async () => {
  let updates = 0;
  stub(UserRepository, 'findById', async () => ({ id: 'client-id', password_hash: '' }));
  stub(UserRepository, 'findByEmail', async (email) =>
    email === 'taken@example.com' ? { id: 'other-user' } : null
  );
  stub(UserRepository, 'update', async () => {
    updates++;
    return null;
  });

  const base = { full_name: 'Client Name', email: 'valid@example.com', phone: '' };
  await assert.rejects(
    UserService.updateMyProfile('client-id', { ...base, email: 'not-an-email' }),
    /корректный адрес электронной почты/
  );
  await assert.rejects(
    UserService.updateMyProfile('client-id', { ...base, phone: '123' }),
    /корректный номер телефона/
  );
  await assert.rejects(
    UserService.updateMyProfile('client-id', { ...base, email: 'taken@example.com' }),
    /уже используется/
  );

  assert.equal(updates, 0);
});
