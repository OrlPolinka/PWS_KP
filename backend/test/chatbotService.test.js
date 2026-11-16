const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { ChatbotRepository } = require('../src/repositories/chatbotRepository');
const { ChatbotService } = require('../src/services/chatbotService');

const originalMethods = new Map();

function stub(target, method, implementation) {
  if (!originalMethods.has(`${target.constructor.name}.${method}`)) {
    originalMethods.set(`${target.constructor.name}.${method}`, { target, method, original: target[method] });
  }
  target[method] = implementation;
}

afterEach(() => {
  for (const { target, method, original } of originalMethods.values()) {
    target[method] = original;
  }
  originalMethods.clear();
});

test('getFaqs trims and limits search text and reveals inactive items only when requested', async () => {
  let received;
  stub(ChatbotRepository, 'getFaqs', async (...args) => {
    received = args;
    return [];
  });

  await ChatbotService.getFaqs(`  ${'x'.repeat(120)}  `, true);

  assert.equal(received[0], 'x'.repeat(100));
  assert.equal(received[1], true);
});

test('createFaq normalizes text and defaults keywords', async () => {
  let received;
  stub(ChatbotRepository, 'createFaq', async (data) => {
    received = data;
    return { id: 1, ...data, is_active: true };
  });

  await ChatbotService.createFaq({
    question: '  Как записаться? ',
    answer: '  Выберите занятие и нажмите «Записаться».  ',
    createdBy: 'admin-id',
  });

  assert.deepEqual(received, {
    question: 'Как записаться?',
    answer: 'Выберите занятие и нажмите «Записаться».',
    keywords: '',
    isActive: true,
    createdBy: 'admin-id',
  });
});

test('createFaq rejects questions and answers outside supported limits before saving', async (t) => {
  let repositoryCalls = 0;
  stub(ChatbotRepository, 'createFaq', async () => {
    repositoryCalls++;
    return {};
  });

  const valid = { question: 'Вопрос', answer: 'Ответ', createdBy: 'admin-id' };
  const invalidCases = [
    { ...valid, question: '  ' },
    { ...valid, question: 'q'.repeat(251) },
    { ...valid, answer: '  ' },
    { ...valid, answer: 'a'.repeat(5001) },
    { ...valid, keywords: 42 },
    { ...valid, keywords: 'k'.repeat(501) },
  ];

  for (const data of invalidCases) {
    await t.test(`rejects invalid field ${Object.keys(data).find((key) => data[key] !== valid[key])}`, async () => {
      await assert.rejects(ChatbotService.createFaq(data), Error);
    });
  }
  assert.equal(repositoryCalls, 0);
});

test('createFaq translates a database duplicate-question conflict', async () => {
  stub(ChatbotRepository, 'createFaq', async () => {
    throw { code: '23505' };
  });

  await assert.rejects(
    ChatbotService.createFaq({ question: 'Часы работы?', answer: 'С 9 до 21.', createdBy: 'admin-id' }),
    /Вопрос с такой формулировкой уже существует/
  );
});

test('updateFaq requires a positive safe identifier and a boolean visibility flag', async () => {
  let repositoryCalls = 0;
  stub(ChatbotRepository, 'updateFaq', async () => {
    repositoryCalls++;
    return null;
  });

  const data = { question: 'Как записаться?', answer: 'Через расписание.', is_active: true };
  await assert.rejects(ChatbotService.updateFaq(0, data), /Некорректный идентификатор/);
  await assert.rejects(ChatbotService.updateFaq(1, { ...data, is_active: 'true' }), /Укажите, должен ли вопрос/);
  assert.equal(repositoryCalls, 0);
});

test('updateFaq reports a missing FAQ and deleteFaq validates existence', async () => {
  stub(ChatbotRepository, 'updateFaq', async () => null);
  stub(ChatbotRepository, 'deleteFaq', async () => false);

  await assert.rejects(
    ChatbotService.updateFaq(3, { question: 'Как записаться?', answer: 'Через расписание.', is_active: false }),
    /Вопрос не найден/
  );
  await assert.rejects(ChatbotService.deleteFaq(3), /Вопрос не найден/);
});
