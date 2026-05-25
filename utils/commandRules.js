const COMMAND_PRODUCT_TYPES = Object.freeze({
  MANUAL: 'manual',
  BEVERAGE: 'beverage',
});

const COMMAND_PAYMENT_METHODS = Object.freeze({
  CASH: 'cash',
  PIX: 'pix',
  DEBIT: 'debit',
  CREDIT: 'credit',
  VOUCHER: 'voucher',
});

const normalizeMoneyValue = (value, fallback = 0) => {
  const normalizedValue = value === undefined ? fallback : Number(value);
  return Number.isFinite(normalizedValue) && normalizedValue >= 0 ? normalizedValue : null;
};

const normalizeProductType = (productType) => {
  if (typeof productType !== 'string') {
    return COMMAND_PRODUCT_TYPES.MANUAL;
  }

  const normalizedType = productType.trim().toLowerCase();
  return normalizedType || COMMAND_PRODUCT_TYPES.MANUAL;
};

const buildBeverageStockImpact = (items, cancelledStatus) => {
  const impactMap = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    if (
      item.status === cancelledStatus ||
      item.productType !== COMMAND_PRODUCT_TYPES.BEVERAGE ||
      !item.productId
    ) {
      return;
    }

    const normalizedQuantity = Number(item.quantity || 0);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
      return;
    }

    const productKey = String(item.productId);
    const currentImpact = impactMap.get(productKey) || {
      productId: item.productId,
      quantity: 0,
      itemNames: new Set(),
    };

    currentImpact.quantity += normalizedQuantity;
    if (item.nameSnapshot) {
      currentImpact.itemNames.add(item.nameSnapshot);
    }
    impactMap.set(productKey, currentImpact);
  });

  return Array.from(impactMap.values()).map((entry) => ({
    productId: entry.productId,
    quantity: entry.quantity,
    itemNames: Array.from(entry.itemNames),
  }));
};

const resolveAssignedWaiterId = ({
  currentUserRole,
  currentUserId,
  requestedWaiterId,
  tableWaiterId,
  waiterRole,
  isValidObjectId,
}) => {
  let assignedWaiterId = currentUserId;

  if (currentUserRole !== waiterRole) {
    if (requestedWaiterId !== undefined && requestedWaiterId !== null && requestedWaiterId !== '') {
      if (!isValidObjectId(requestedWaiterId)) {
        return { error: 'Invalid waiter ID' };
      }

      assignedWaiterId = requestedWaiterId;
    } else if (tableWaiterId) {
      assignedWaiterId = tableWaiterId;
    }
  }

  return { assignedWaiterId };
};

const normalizePaymentMethod = (method) => {
  if (typeof method !== 'string') {
    return '';
  }

  return method.trim().toLowerCase();
};

const roundMoneyValue = (value) => Math.round(Number(value || 0) * 100) / 100;

const normalizeCommandPayments = ({
  rawPayments,
  commandTotal,
  currentUserId,
  isValidObjectId,
}) => {
  const normalizedTotal = normalizeMoneyValue(commandTotal, 0);
  if (normalizedTotal === null) {
    return { error: 'Command total must be a valid non-negative number' };
  }

  const payments = Array.isArray(rawPayments) ? rawPayments : [];

  if (normalizedTotal === 0) {
    return { payments: [] };
  }

  if (payments.length === 0) {
    return { error: 'At least one payment entry is required to close a command with value' };
  }

  const normalizedPayments = [];

  for (const payment of payments) {
    const method = normalizePaymentMethod(payment?.method);
    if (!Object.values(COMMAND_PAYMENT_METHODS).includes(method)) {
      return { error: 'Invalid payment method' };
    }

    const amount = normalizeMoneyValue(payment?.amount, null);
    if (amount === null || amount <= 0) {
      return { error: 'Payment amount must be a valid number greater than zero' };
    }

    const receivedBy =
      payment?.receivedBy && isValidObjectId(payment.receivedBy)
        ? payment.receivedBy
        : currentUserId || null;

    const paidAtInput = payment?.paidAt ? new Date(payment.paidAt) : new Date();
    if (Number.isNaN(paidAtInput.getTime())) {
      return { error: 'Invalid payment date' };
    }

    normalizedPayments.push({
      method,
      amount: roundMoneyValue(amount),
      paidAt: paidAtInput,
      receivedBy,
      machineLabel: typeof payment?.machineLabel === 'string' ? payment.machineLabel.trim() : '',
      referenceCode: typeof payment?.referenceCode === 'string' ? payment.referenceCode.trim() : '',
      notes: typeof payment?.notes === 'string' ? payment.notes.trim() : '',
    });
  }

  const paymentTotal = roundMoneyValue(
    normalizedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
  );
  const expectedTotal = roundMoneyValue(normalizedTotal);

  if (paymentTotal !== expectedTotal) {
    return {
      error: `Payment total must match the command total. Expected ${expectedTotal.toFixed(2)}, received ${paymentTotal.toFixed(2)}`,
    };
  }

  return { payments: normalizedPayments };
};

module.exports = {
  COMMAND_PRODUCT_TYPES,
  COMMAND_PAYMENT_METHODS,
  normalizeMoneyValue,
  normalizeProductType,
  buildBeverageStockImpact,
  resolveAssignedWaiterId,
  normalizePaymentMethod,
  normalizeCommandPayments,
};
