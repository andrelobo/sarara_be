const test = require('node:test');
const assert = require('node:assert/strict');

const { USER_ROLES } = require('../constants/userAccess');
const { COMMAND_PAYMENT_METHODS } = require('../utils/commandRules');
const {
  buildEmptyPaymentTotals,
  buildShiftTotals,
  normalizeShiftDateRange,
  normalizeShiftNotes,
  resolveShiftWaiterId,
} = require('../utils/shiftRules');

test('buildEmptyPaymentTotals starts every supported method at zero', () => {
  assert.deepEqual(buildEmptyPaymentTotals(), {
    cash: 0,
    pix: 0,
    debit: 0,
    credit: 0,
    voucher: 0,
    total: 0,
  });
});

test('buildShiftTotals aggregates sales and payments by method', () => {
  const totals = buildShiftTotals([
    {
      total: 80,
      serviceTax: 10,
      payments: [
        { method: COMMAND_PAYMENT_METHODS.CASH, amount: 30 },
        { method: COMMAND_PAYMENT_METHODS.PIX, amount: 50 },
      ],
    },
    {
      total: 42.5,
      serviceTax: 2.5,
      payments: [
        { method: COMMAND_PAYMENT_METHODS.DEBIT, amount: 20 },
        { method: COMMAND_PAYMENT_METHODS.CREDIT, amount: 22.5 },
      ],
    },
  ]);

  assert.equal(totals.commandsCount, 2);
  assert.equal(totals.paymentCount, 4);
  assert.equal(totals.salesTotal, 122.5);
  assert.equal(totals.serviceTaxTotal, 12.5);
  assert.deepEqual(totals.payments, {
    cash: 30,
    pix: 50,
    debit: 20,
    credit: 22.5,
    voucher: 0,
    total: 122.5,
  });
});

test('resolveShiftWaiterId forces waiter-owned shifts to stay on the logged waiter', () => {
  const result = resolveShiftWaiterId({
    currentUser: { _id: 'waiter-self', role: USER_ROLES.WAITER },
    requestedWaiterId: 'other-waiter',
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId: () => true,
  });

  assert.equal(result.waiterId, 'waiter-self');
});

test('resolveShiftWaiterId requires a valid waiter id for manager/admin initiated shifts', () => {
  const result = resolveShiftWaiterId({
    currentUser: { _id: 'manager-1', role: USER_ROLES.MANAGER },
    requestedWaiterId: 'bad-id',
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId: () => false,
  });

  assert.equal(result.error, 'A valid waiter ID is required');
});

test('normalizeShiftNotes trims strings and normalizeShiftDateRange protects invalid ordering', () => {
  assert.equal(normalizeShiftNotes('  fechamento caixa  '), 'fechamento caixa');
  assert.equal(normalizeShiftNotes(undefined), '');

  const openedAt = new Date('2026-05-24T12:00:00.000Z');
  const closedAt = new Date('2026-05-24T11:00:00.000Z');

  assert.equal(
    normalizeShiftDateRange(openedAt, closedAt).error,
    'Shift closedAt cannot be earlier than openedAt',
  );
});
