const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');
const { DanceStyleRepository } = require('../src/repositories/danceStyleRepository');
const { MembershipTypeRepository } = require('../src/repositories/membershipTypeRepository');
const { DanceStyleService } = require('../src/services/danceStyleService');
const { MembershipTypeService } = require('../src/services/membershipTypeService');

const originalDanceStyleMethods = {
  findById: DanceStyleRepository.findById,
  setActive: DanceStyleRepository.setActive,
  delete: DanceStyleRepository.delete,
};
const originalMembershipTypeMethods = {
  findById: MembershipTypeRepository.findById,
  delete: MembershipTypeRepository.delete,
};

afterEach(() => {
  Object.assign(DanceStyleRepository, originalDanceStyleMethods);
  Object.assign(MembershipTypeRepository, originalMembershipTypeMethods);
});

test('removing a dance style archives it without deleting its related history', async () => {
  let archivedStatus;
  DanceStyleRepository.findById = async () => ({ id: 1, is_active: true });
  DanceStyleRepository.setActive = async (_id, isActive) => {
    archivedStatus = isActive;
    return { id: 1, is_active: isActive };
  };
  DanceStyleRepository.delete = async () => {
    throw new Error('permanent delete must not run while archiving');
  };

  await DanceStyleService.remove(1);

  assert.equal(archivedStatus, false);
});

test('permanent deletion is limited to archived dance styles', async () => {
  DanceStyleRepository.findById = async () => ({ id: 1, is_active: true });
  await assert.rejects(DanceStyleService.permanentlyDelete(1), /Сначала переместите стиль в архив/);

  let deletedId;
  DanceStyleRepository.findById = async () => ({ id: 1, is_active: false });
  DanceStyleRepository.delete = async (id) => {
    deletedId = id;
    return true;
  };
  await DanceStyleService.permanentlyDelete(1);

  assert.equal(deletedId, 1);
});

test('permanent deletion is limited to archived membership types', async () => {
  MembershipTypeRepository.findById = async () => ({ id: 2, is_active: true });
  await assert.rejects(
    MembershipTypeService.permanentlyDeleteMembershipType(2),
    /Archive the membership type before deleting it permanently/
  );

  let deletedId;
  MembershipTypeRepository.findById = async () => ({ id: 2, is_active: false });
  MembershipTypeRepository.delete = async (id) => {
    deletedId = id;
    return true;
  };
  await MembershipTypeService.permanentlyDeleteMembershipType(2);

  assert.equal(deletedId, 2);
});
