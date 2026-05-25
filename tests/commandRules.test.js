const test = require('node:test');
const assert = require('node:assert/strict');

const { COMMAND_ITEM_STATUSES } = require('../models/commandModel');
const { USER_ROLES } = require('../constants/userAccess');
const {
  COMMAND_PRODUCT_TYPES,
  COMMAND_PAYMENT_METHODS,
  normalizeMoneyValue,
  normalizeProductType,
  buildBeverageStockImpact,
  normalizeCommandPayments,
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

test('normalizeCommandPayments accepts mixed methods and assigns the current user by default', () => {
  const result = normalizeCommandPayments({
    rawPayments: [
      {
        method: COMMAND_PAYMENT_METHODS.PIX,
        amount: '40.50',
        referenceCode: 'pix-001',
      },
      {
        method: COMMAND_PAYMENT_METHODS.CASH,
        amount: 9.5,
        notes: 'Troco redondo',
      },
    ],
    commandTotal: 50,
    currentUserId: 'waiter-1',
    isValidObjectId: () => false,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.payments.length, 2);
  assert.equal(result.payments[0].method, COMMAND_PAYMENT_METHODS.PIX);
  assert.equal(result.payments[0].amount, 40.5);
  assert.equal(result.payments[0].receivedBy, 'waiter-1');
  assert.equal(result.payments[1].method, COMMAND_PAYMENT_METHODS.CASH);
  assert.equal(result.payments[1].amount, 9.5);
});

test('normalizeCommandPayments rejects missing entries for non-zero commands', () => {
  const result = normalizeCommandPayments({
    rawPayments: [],
    commandTotal: 19,
    currentUserId: 'waiter-1',
    isValidObjectId: () => true,
  });

  assert.equal(result.error, 'At least one payment entry is required to close a command with value');
});

test('normalizeCommandPayments rejects totals that do not match the command value', () => {
  const result = normalizeCommandPayments({
    rawPayments: [
      {
        method: COMMAND_PAYMENT_METHODS.DEBIT,
        amount: 20,
      },
    ],
    commandTotal: 25,
    currentUserId: 'waiter-1',
    isValidObjectId: () => true,
  });

  assert.match(result.error, /Payment total must match the command total/);
});
