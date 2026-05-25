const { COMMAND_PAYMENT_METHODS, normalizeMoneyValue } = require('./commandRules');

const buildEmptyPaymentTotals = () => ({
  [COMMAND_PAYMENT_METHODS.CASH]: 0,
  [COMMAND_PAYMENT_METHODS.PIX]: 0,
  [COMMAND_PAYMENT_METHODS.DEBIT]: 0,
  [COMMAND_PAYMENT_METHODS.CREDIT]: 0,
  [COMMAND_PAYMENT_METHODS.VOUCHER]: 0,
  total: 0,
});

const roundMoneyValue = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildShiftTotals = (commands) => {
  const normalizedCommands = Array.isArray(commands) ? commands : [];
  const payments = buildEmptyPaymentTotals();

  const totals = normalizedCommands.reduce(
    (accumulator, command) => {
      accumulator.commandsCount += 1;
      accumulator.salesTotal += Number(command?.total || 0);
      accumulator.serviceTaxTotal += Number(command?.serviceTax || 0);

      (Array.isArray(command?.payments) ? command.payments : []).forEach((payment) => {
        const method = payment?.method;
        const amount = Number(payment?.amount || 0);

        if (!Object.values(COMMAND_PAYMENT_METHODS).includes(method) || amount <= 0) {
          return;
        }

        accumulator.paymentCount += 1;
        accumulator.payments[method] += amount;
        accumulator.payments.total += amount;
      });

      return accumulator;
    },
    {
      commandsCount: 0,
      paymentCount: 0,
      salesTotal: 0,
      serviceTaxTotal: 0,
      payments,
    },
  );

  return {
    commandsCount: totals.commandsCount,
    paymentCount: totals.paymentCount,
    salesTotal: roundMoneyValue(totals.salesTotal),
    serviceTaxTotal: roundMoneyValue(totals.serviceTaxTotal),
    payments: Object.fromEntries(
      Object.entries(totals.payments).map(([key, value]) => [key, roundMoneyValue(value)]),
    ),
    computedAt: new Date(),
  };
};

const resolveShiftWaiterId = ({
  currentUser,
  requestedWaiterId,
  waiterRole,
  isValidObjectId,
}) => {
  if (!currentUser) {
    return { error: 'Current user is required' };
  }

  if (currentUser.role === waiterRole) {
    return { waiterId: currentUser._id };
  }

  if (!requestedWaiterId || !isValidObjectId(requestedWaiterId)) {
    return { error: 'A valid waiter ID is required' };
  }

  return { waiterId: requestedWaiterId };
};

const normalizeShiftNotes = (notes) => {
  if (notes === undefined || notes === null) {
    return '';
  }

  return typeof notes === 'string' ? notes.trim() : '';
};

const normalizeShiftDateRange = (openedAt, closedAt = null) => {
  if (!(openedAt instanceof Date) || Number.isNaN(openedAt.getTime())) {
    return { error: 'Shift openedAt must be a valid date' };
  }

  if (closedAt !== null && (!(closedAt instanceof Date) || Number.isNaN(closedAt.getTime()))) {
    return { error: 'Shift closedAt must be a valid date' };
  }

  if (closedAt && closedAt.getTime() < openedAt.getTime()) {
    return { error: 'Shift closedAt cannot be earlier than openedAt' };
  }

  return { openedAt, closedAt };
};

const normalizeShiftTotalsOverride = (value) => normalizeMoneyValue(value, 0);

module.exports = {
  buildEmptyPaymentTotals,
  buildShiftTotals,
  normalizeShiftDateRange,
  normalizeShiftNotes,
  normalizeShiftTotalsOverride,
  resolveShiftWaiterId,
};
