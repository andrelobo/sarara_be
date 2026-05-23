const test = require('node:test');
const assert = require('node:assert/strict');

const { COMMAND_ITEM_STATUSES } = require('../models/commandModel');
const { USER_ROLES } = require('../constants/userAccess');
const {
  COMMAND_PRODUCT_TYPES,
  normalizeMoneyValue,
  normalizeProductType,
  buildBeverageStockImpact,
  resolveAssignedWaiterId,
} = require('../utils/commandRules');

test('normalizeMoneyValue accepts zero, valid numbers, and fallback values', () => {
  assert.equal(normalizeMoneyValue(undefined, 7), 7);
  assert.equal(normalizeMoneyValue(0), 0);
  assert.equal(normalizeMoneyValue('12.5'), 12.5);
  assert.equal(normalizeMoneyValue(-1), null);
  assert.equal(normalizeMoneyValue('abc'), null);
});

test('normalizeProductType defaults to manual and trims the payload', () => {
  assert.equal(normalizeProductType(), COMMAND_PRODUCT_TYPES.MANUAL);
  assert.equal(normalizeProductType('   '), COMMAND_PRODUCT_TYPES.MANUAL);
  assert.equal(normalizeProductType(' beverage '), COMMAND_PRODUCT_TYPES.BEVERAGE);
});

test('buildBeverageStockImpact aggregates beverage lines and ignores manual or cancelled items', () => {
  const impact = buildBeverageStockImpact(
    [
      {
        productType: COMMAND_PRODUCT_TYPES.BEVERAGE,
        productId: 'bev-1',
        nameSnapshot: 'Negroni',
        quantity: 2,
        status: COMMAND_ITEM_STATUSES.PENDING,
      },
      {
        productType: COMMAND_PRODUCT_TYPES.BEVERAGE,
        productId: 'bev-1',
        nameSnapshot: 'Negroni',
        quantity: 1,
        status: COMMAND_ITEM_STATUSES.DELIVERED,
      },
      {
        productType: COMMAND_PRODUCT_TYPES.BEVERAGE,
        productId: 'bev-2',
        nameSnapshot: 'Spritz',
        quantity: 3,
        status: COMMAND_ITEM_STATUSES.CANCELLED,
      },
      {
        productType: COMMAND_PRODUCT_TYPES.MANUAL,
        productId: null,
        nameSnapshot: 'Couvert',
        quantity: 4,
        status: COMMAND_ITEM_STATUSES.PENDING,
      },
    ],
    COMMAND_ITEM_STATUSES.CANCELLED,
  );

  assert.deepEqual(impact, [
    {
      productId: 'bev-1',
      quantity: 3,
      itemNames: ['Negroni'],
    },
  ]);
});

test('resolveAssignedWaiterId keeps waiter-owned commands with the logged user', () => {
  const result = resolveAssignedWaiterId({
    currentUserRole: USER_ROLES.WAITER,
    currentUserId: 'waiter-self',
    requestedWaiterId: 'waiter-other',
    tableWaiterId: 'waiter-table',
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId: () => true,
  });

  assert.equal(result.assignedWaiterId, 'waiter-self');
});

test('resolveAssignedWaiterId lets admin assign an explicit waiter or inherit the table waiter', () => {
  const explicitWaiter = resolveAssignedWaiterId({
    currentUserRole: USER_ROLES.ADMIN,
    currentUserId: 'admin-user',
    requestedWaiterId: 'waiter-explicit',
    tableWaiterId: 'waiter-table',
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId: () => true,
  });

  const inheritedWaiter = resolveAssignedWaiterId({
    currentUserRole: USER_ROLES.ADMIN,
    currentUserId: 'admin-user',
    requestedWaiterId: undefined,
    tableWaiterId: 'waiter-table',
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId: () => true,
  });

  assert.equal(explicitWaiter.assignedWaiterId, 'waiter-explicit');
  assert.equal(inheritedWaiter.assignedWaiterId, 'waiter-table');
});

test('resolveAssignedWaiterId rejects invalid explicit waiter ids for non-waiter creators', () => {
  const result = resolveAssignedWaiterId({
    currentUserRole: USER_ROLES.MANAGER,
    currentUserId: 'manager-user',
    requestedWaiterId: 'bad-id',
    tableWaiterId: null,
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId: () => false,
  });

  assert.equal(result.error, 'Invalid waiter ID');
});
