const COMMAND_PRODUCT_TYPES = Object.freeze({
  MANUAL: 'manual',
  BEVERAGE: 'beverage',
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

module.exports = {
  COMMAND_PRODUCT_TYPES,
  normalizeMoneyValue,
  normalizeProductType,
  buildBeverageStockImpact,
  resolveAssignedWaiterId,
};
