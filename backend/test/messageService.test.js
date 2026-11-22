const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { MessageRepository, UserRepository } = require('../src/repositories');
const { MessageService } = require('../src/services/messageService');

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

test('getContacts forwards client filtering and still supports role selection', async () => {
  let received;
  stub(MessageRepository, 'getContacts', async (...args) => {
    received = args;
    return [];
  });

  await MessageService.getContacts('client-id', '  name  ', 'trainer', true);

  assert.deepEqual(received, ['client-id', 'name', 'trainer', true]);
});

test('client users cannot list, open, or message other clients', async () => {
  let excludeClients;
  stub(UserRepository, 'findById', async (id) => ({
    id,
    role: 'client',
    is_active: true,
  }));
  stub(MessageRepository, 'getUserConversations', async (_id, filterClients) => {
    excludeClients = filterClients;
    return [];
  });
  let created = false;
  stub(MessageRepository, 'create', async () => {
    created = true;
    return {};
  });

  await MessageService.getUserConversations('client-one');
  await assert.rejects(MessageService.getDialog('client-one', 'client-two'), /не могут открывать диалоги/);
  await assert.rejects(MessageService.sendMessage({
    sender_id: 'client-one',
    receiver_id: 'client-two',
    content: 'Привет',
  }), /не могут начинать диалог/);

  assert.equal(excludeClients, true);
  assert.equal(created, false);
});

test('other roles can still start conversations with clients', async () => {
  stub(UserRepository, 'findById', async (id) => ({
    id,
    role: id === 'trainer-id' ? 'trainer' : 'client',
    is_active: true,
  }));
  const message = { id: 1 };
  stub(MessageRepository, 'create', async () => message);

  assert.equal(await MessageService.sendMessage({
    sender_id: 'trainer-id',
    receiver_id: 'client-id',
    content: 'Привет',
  }), message);
});
