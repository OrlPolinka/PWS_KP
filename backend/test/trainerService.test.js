const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { TrainerRepository } = require('../src/repositories');
const { TrainerService } = require('../src/services/trainerService');

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

test('createTrainer and updateTrainer reject experience outside the integer range 0-70', async () => {
  for (const experience_years of [-1, 70.5, 71]) {
    await assert.rejects(
      TrainerService.createTrainer('user-id', { experience_years }),
      /целым числом от 0 до 70/
    );
    await assert.rejects(
      TrainerService.updateTrainer('trainer-id', { experience_years }),
      /целым числом от 0 до 70/
    );
  }
});

test('updateTrainer accepts the 70-year maximum', async () => {
  const trainer = { id: 'trainer-id', experience_years: 70 };
  let updatedData;
  stub(TrainerRepository, 'findById', async () => trainer);
  stub(TrainerRepository, 'update', async (_id, data) => {
    updatedData = data;
    return trainer;
  });

  const result = await TrainerService.updateTrainer('trainer-id', { experience_years: 70 });

  assert.equal(result.experience_years, 70);
  assert.equal(updatedData.experience_years, 70);
});
