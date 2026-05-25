const mongoose = require('mongoose');
const Beverage = require('../models/beverageModel');
const { Command, COMMAND_STATUSES, COMMAND_ITEM_STATUSES } = require('../models/commandModel');
const { Table, TABLE_STATUSES } = require('../models/tableModel');
const { USER_ROLES } = require('../constants/userAccess');
const { appendAuditEntry } = require('../utils/salonAudit');
const {
  COMMAND_PRODUCT_TYPES,
  normalizeMoneyValue,
  normalizeProductType,
  buildBeverageStockImpact,
  normalizeCommandPayments,
  resolveAssignedWaiterId,
} = require('../utils/commandRules');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildHttpError = (statusCode, publicMessage) => {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
};

const resolveCommandItemProduct = async ({ productType, productId, nameSnapshot }) => {
  const normalizedProductType = normalizeProductType(productType);
  const normalizedNameSnapshot = typeof nameSnapshot === 'string' ? nameSnapshot.trim() : '';
  const normalizedProductId = productId || null;

  if (!Object.values(COMMAND_PRODUCT_TYPES).includes(normalizedProductType)) {
    return { error: 'Invalid product type' };
  }

  if (normalizedProductType === COMMAND_PRODUCT_TYPES.BEVERAGE) {
    if (!normalizedProductId || !isValidObjectId(normalizedProductId)) {
      return { error: 'A valid beverage product ID is required' };
    }

    const beverage = await Beverage.findOne({ _id: normalizedProductId, deletedAt: null }).select('name');
    if (!beverage) {
      return { error: 'Selected beverage was not found' };
    }

    return {
      productType: COMMAND_PRODUCT_TYPES.BEVERAGE,
      productId: beverage._id,
      nameSnapshot: beverage.name,
    };
  }

  if (!normalizedNameSnapshot) {
    return { error: 'Item name is required' };
  }

  return {
    productType: COMMAND_PRODUCT_TYPES.MANUAL,
    productId: null,
    nameSnapshot: normalizedNameSnapshot,
  };
};

const isTransactionNotSupportedError = (error) => {
  const message = error?.message || '';

  return (
    message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('Standalone servers do not support transactions') ||
    message.includes('transactions are not supported')
  );
};

const withSession = (query, session) => (session ? query.session(session) : query);

const applyBeverageStockOnClose = async (command, session = null) => {
  const stockImpact = buildBeverageStockImpact(command.items, COMMAND_ITEM_STATUSES.CANCELLED);

  if (stockImpact.length === 0) {
    return;
  }

  const beverageIds = stockImpact.map((entry) => entry.productId);
  const beverages = await withSession(
    Beverage.find({
      _id: { $in: beverageIds },
      deletedAt: null,
    }),
    session,
  );

  const beverageMap = new Map(beverages.map((beverage) => [String(beverage._id), beverage]));

  for (const impactEntry of stockImpact) {
    const beverage = beverageMap.get(String(impactEntry.productId));

    if (!beverage) {
      throw buildHttpError(409, 'One of the beverage-linked items no longer exists in inventory');
    }

    if (Number(beverage.quantity) < impactEntry.quantity) {
      throw buildHttpError(
        409,
        `Insufficient stock for ${beverage.name}. Required ${impactEntry.quantity}, available ${beverage.quantity}`,
      );
    }
  }

  for (const impactEntry of stockImpact) {
    const beverage = beverageMap.get(String(impactEntry.productId));

    beverage.quantity = Number(beverage.quantity) - impactEntry.quantity;
    beverage.history.push({
      date: new Date(),
      change: 'sold',
      quantity: impactEntry.quantity,
    });

    await beverage.save(session ? { session } : undefined);
  }
};

const releaseCommandTable = async (tableId, closedAt, session = null, currentUser = null, event = 'table_released') => {
  const table = await withSession(Table.findById(tableId), session);
  if (!table) {
    return;
  }

  const previousState = {
    status: table.status,
    currentCommandId: table.currentCommandId ? String(table.currentCommandId) : null,
    waiterId: table.waiterId ? String(table.waiterId) : null,
  };

  table.status = TABLE_STATUSES.FREE;
  table.closedAt = closedAt;
  table.currentCommandId = null;
  table.waiterId = null;
  appendAuditEntry(table, event, currentUser, {
    previousState,
    nextState: {
      status: table.status,
      currentCommandId: null,
      waiterId: null,
    },
  });
  await table.save(session ? { session } : undefined);
};

const finalizeCommand = async ({
  commandId,
  currentUser,
  nextStatus,
  closePermissionMessage,
  cancelItems = false,
  deductStock = false,
  payments = null,
  session = null,
}) => {
  const command = await withSession(Command.findById(commandId), session);
  if (!command) {
    throw buildHttpError(404, 'Command not found');
  }

  if (command.status !== COMMAND_STATUSES.OPEN) {
    throw buildHttpError(409, `Only open commands can be ${nextStatus === COMMAND_STATUSES.CLOSED ? 'closed' : 'cancelled'}`);
  }

  if (!canOperateOnCommand(currentUser, command)) {
    throw buildHttpError(403, closePermissionMessage);
  }

  const closedAt = new Date();

  if (deductStock) {
    await applyBeverageStockOnClose(command, session);
  }

  if (nextStatus === COMMAND_STATUSES.CLOSED) {
    const normalizedPayments = normalizeCommandPayments({
      rawPayments: payments,
      commandTotal: command.total,
      currentUserId: currentUser?._id || null,
      isValidObjectId,
    });

    if (normalizedPayments.error) {
      throw buildHttpError(400, normalizedPayments.error);
    }

    command.payments = normalizedPayments.payments;
  } else if (cancelItems) {
    command.payments = [];
  }

  command.status = nextStatus;
  command.closedAt = closedAt;

  if (cancelItems) {
    command.items.forEach((item) => {
      item.status = COMMAND_ITEM_STATUSES.CANCELLED;
    });
    recalculateCommandTotals(command);
  }

  appendAuditEntry(
    command,
    nextStatus === COMMAND_STATUSES.CLOSED ? 'command_closed' : 'command_cancelled',
    currentUser,
    {
      tableId: String(command.tableId),
      itemCount: command.items.length,
      deductStock,
      paymentCount: Array.isArray(command.payments) ? command.payments.length : 0,
      paymentTotal: Array.isArray(command.payments)
        ? command.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
        : 0,
    },
    closedAt,
  );

  const updatedCommand = await command.save(session ? { session } : undefined);
  await releaseCommandTable(
    command.tableId,
    closedAt,
    session,
    currentUser,
    nextStatus === COMMAND_STATUSES.CLOSED ? 'table_released_after_command_close' : 'table_released_after_command_cancel',
  );

  return updatedCommand;
};

const executeWithOptionalTransaction = async (operation) => {
  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } catch (error) {
    if (isTransactionNotSupportedError(error)) {
      console.warn('MongoDB transactions are not supported in the current environment. Falling back to sequential command finalization.');
      return operation(null);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const createCommandForTable = async ({
  tableId,
  waiterId,
  serviceTax,
  syncMetadata,
  currentUser,
  session = null,
}) => {
  const table = await withSession(Table.findOne({ _id: tableId, deletedAt: null }), session);
  if (!table) {
    throw buildHttpError(404, 'Table not found');
  }

  if (table.currentCommandId) {
    throw buildHttpError(409, 'This table already has an active command');
  }

  if (table.status === TABLE_STATUSES.CLOSING) {
    throw buildHttpError(409, 'This table is closing and cannot receive a new command');
  }

  const waiterResolution = resolveAssignedWaiterId({
    currentUserRole: currentUser.role,
    currentUserId: currentUser._id,
    requestedWaiterId: waiterId,
    tableWaiterId: table.waiterId,
    waiterRole: USER_ROLES.WAITER,
    isValidObjectId,
  });

  if (waiterResolution.error) {
    throw buildHttpError(400, waiterResolution.error);
  }

  const assignedWaiterId = waiterResolution.assignedWaiterId;

  const command = new Command({
    tableId: table._id,
    waiterId: assignedWaiterId,
    serviceTax,
    syncMetadata,
  });

  recalculateCommandTotals(command);
  appendAuditEntry(command, 'command_created', currentUser, {
    tableId: String(table._id),
    waiterId: String(assignedWaiterId),
    serviceTax,
  });

  const savedCommand = await command.save(session ? { session } : undefined);

  const previousState = {
    status: table.status,
    currentCommandId: table.currentCommandId ? String(table.currentCommandId) : null,
    waiterId: table.waiterId ? String(table.waiterId) : null,
  };

  table.status = TABLE_STATUSES.OCCUPIED;
  table.openedAt = table.openedAt || savedCommand.openedAt;
  table.closedAt = null;
  table.currentCommandId = savedCommand._id;
  table.waiterId = assignedWaiterId;
  appendAuditEntry(table, 'command_attached_to_table', currentUser, {
    previousState,
    commandId: String(savedCommand._id),
    nextState: {
      status: table.status,
      currentCommandId: String(table.currentCommandId),
      waiterId: String(table.waiterId),
    },
  });
  await table.save(session ? { session } : undefined);

  return savedCommand;
};

const recalculateCommandTotals = (command) => {
  const subtotal = command.items.reduce((sum, item) => {
    if (item.status === COMMAND_ITEM_STATUSES.CANCELLED) {
      return sum;
    }

    return sum + Number(item.quantity) * Number(item.unitPrice);
  }, 0);

  command.subtotal = subtotal;
  command.total = subtotal + Number(command.serviceTax || 0);
};

const findCommandById = (id) => Command.findById(id);

const serializeCommand = (commandDocument) => commandDocument;

const canOperateOnCommand = (currentUser, command) => {
  if (!currentUser || !command) {
    return false;
  }

  if ([USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(currentUser.role)) {
    return true;
  }

  return String(command.waiterId) === String(currentUser._id);
};

const commandController = {
  async createCommand(req, res) {
    const { tableId, waiterId, serviceTax = 0, syncMetadata = null } = req.body;

    if (!tableId || !isValidObjectId(tableId)) {
      return res.status(400).json({ error: 'A valid table ID is required' });
    }

    const normalizedServiceTax = normalizeMoneyValue(serviceTax);
    if (normalizedServiceTax === null) {
      return res.status(400).json({ error: 'Service tax must be a valid non-negative number' });
    }

    try {
      const savedCommand = await executeWithOptionalTransaction((session) =>
        createCommandForTable({
          tableId,
          waiterId,
          serviceTax: normalizedServiceTax,
          syncMetadata,
          currentUser: req.currentUser,
          session,
        }),
      );

      return res.status(201).json(serializeCommand(savedCommand));
    } catch (error) {
      if (error.statusCode && error.publicMessage) {
        return res.status(error.statusCode).json({ error: error.publicMessage });
      }

      console.error('Erro ao criar comanda:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllCommands(req, res) {
    const { status, tableId, waiterId } = req.query;

    const filter = {};

    if (status !== undefined) {
      if (!Object.values(COMMAND_STATUSES).includes(status)) {
        return res.status(400).json({ error: 'Invalid command status' });
      }
      filter.status = status;
    }

    if (tableId !== undefined) {
      if (!isValidObjectId(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      filter.tableId = tableId;
    }

    if (waiterId !== undefined) {
      if (!isValidObjectId(waiterId)) {
        return res.status(400).json({ error: 'Invalid waiter ID' });
      }
      filter.waiterId = waiterId;
    }

    if (req.currentUser.role === USER_ROLES.WAITER) {
      filter.waiterId = req.currentUser._id;
    }

    try {
      const commands = await Command.find(filter).select('-auditTrail').sort({ openedAt: -1 });
      return res.status(200).json(commands.map(serializeCommand));
    } catch (error) {
      console.error('Erro ao listar comandas:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getCommandById(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid command ID' });
    }

    try {
      const command = await findCommandById(id);
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      if (!canOperateOnCommand(req.currentUser, command) && req.currentUser.role === USER_ROLES.WAITER) {
        return res.status(403).json({ error: 'You do not have permission to access this command' });
      }

      return res.status(200).json(serializeCommand(command));
    } catch (error) {
      console.error('Erro ao buscar comanda:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async addCommandItem(req, res) {
    const { id } = req.params;
    const { productType, productId, nameSnapshot, quantity, unitPrice, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid command ID' });
    }

    const normalizedQuantity = Number(quantity);
    const normalizedUnitPrice = normalizeMoneyValue(unitPrice, null);

    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
      return res.status(400).json({ error: 'Quantity must be a valid integer greater than zero' });
    }

    if (normalizedUnitPrice === null) {
      return res.status(400).json({ error: 'Unit price must be a valid non-negative number' });
    }

    try {
      const resolvedProduct = await resolveCommandItemProduct({
        productType,
        productId,
        nameSnapshot,
      });

      if (resolvedProduct.error) {
        return res.status(400).json({ error: resolvedProduct.error });
      }

      const command = await findCommandById(id);
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      if (command.status !== COMMAND_STATUSES.OPEN) {
        return res.status(409).json({ error: 'Only open commands can receive new items' });
      }

      if (!canOperateOnCommand(req.currentUser, command)) {
        return res.status(403).json({ error: 'You do not have permission to update this command' });
      }

      command.items.push({
        productType: resolvedProduct.productType,
        productId: resolvedProduct.productId,
        nameSnapshot: resolvedProduct.nameSnapshot,
        quantity: normalizedQuantity,
        unitPrice: normalizedUnitPrice,
        notes: typeof notes === 'string' ? notes.trim() : '',
      });

      const addedItem = command.items[command.items.length - 1];
      appendAuditEntry(command, 'command_item_added', req.currentUser, {
        itemId: String(addedItem._id),
        productType: addedItem.productType,
        productId: addedItem.productId ? String(addedItem.productId) : null,
        nameSnapshot: addedItem.nameSnapshot,
        quantity: addedItem.quantity,
        unitPrice: addedItem.unitPrice,
      });

      recalculateCommandTotals(command);

      const updatedCommand = await command.save();
      return res.status(200).json(serializeCommand(updatedCommand));
    } catch (error) {
      console.error('Erro ao adicionar item na comanda:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateCommandItem(req, res) {
    const { id, itemId } = req.params;
    const { quantity, unitPrice, notes, status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid command ID' });
    }

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({ error: 'Invalid command item ID' });
    }

    if (
      quantity === undefined &&
      unitPrice === undefined &&
      notes === undefined &&
      status === undefined
    ) {
      return res.status(400).json({ error: 'No valid fields were sent for update' });
    }

    try {
      const command = await findCommandById(id);
      if (!command) {
        return res.status(404).json({ error: 'Command not found' });
      }

      if (command.status !== COMMAND_STATUSES.OPEN) {
        return res.status(409).json({ error: 'Only open commands can be updated' });
      }

      if (!canOperateOnCommand(req.currentUser, command)) {
        return res.status(403).json({ error: 'You do not have permission to update this command' });
      }

      const item = command.items.id(itemId);
      if (!item) {
        return res.status(404).json({ error: 'Command item not found' });
      }

      const previousItemState = {
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes,
        status: item.status,
      };

      if (quantity !== undefined) {
        const normalizedQuantity = Number(quantity);
        if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
          return res.status(400).json({ error: 'Quantity must be a valid integer greater than zero' });
        }
        item.quantity = normalizedQuantity;
      }

      if (unitPrice !== undefined) {
        const normalizedUnitPrice = normalizeMoneyValue(unitPrice, null);
        if (normalizedUnitPrice === null) {
          return res.status(400).json({ error: 'Unit price must be a valid non-negative number' });
        }
        item.unitPrice = normalizedUnitPrice;
      }

      if (notes !== undefined) {
        item.notes = typeof notes === 'string' ? notes.trim() : '';
      }

      if (status !== undefined) {
        if (!Object.values(COMMAND_ITEM_STATUSES).includes(status)) {
          return res.status(400).json({ error: 'Invalid command item status' });
        }
        item.status = status;
      }

      appendAuditEntry(command, 'command_item_updated', req.currentUser, {
        itemId: String(item._id),
        nameSnapshot: item.nameSnapshot,
        previous: previousItemState,
        next: {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
          status: item.status,
        },
      });

      recalculateCommandTotals(command);

      const updatedCommand = await command.save();
      return res.status(200).json(serializeCommand(updatedCommand));
    } catch (error) {
      console.error('Erro ao atualizar item da comanda:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async closeCommand(req, res) {
    const { id } = req.params;
    const { payments = [] } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid command ID' });
    }

    try {
      const updatedCommand = await executeWithOptionalTransaction((session) =>
        finalizeCommand({
          commandId: id,
          currentUser: req.currentUser,
          nextStatus: COMMAND_STATUSES.CLOSED,
          closePermissionMessage: 'You do not have permission to close this command',
          deductStock: true,
          payments,
          session,
        }),
      );

      return res.status(200).json(serializeCommand(updatedCommand));
    } catch (error) {
      if (error.statusCode && error.publicMessage) {
        return res.status(error.statusCode).json({ error: error.publicMessage });
      }

      console.error('Erro ao fechar comanda:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async cancelCommand(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid command ID' });
    }

    try {
      const updatedCommand = await executeWithOptionalTransaction((session) =>
        finalizeCommand({
          commandId: id,
          currentUser: req.currentUser,
          nextStatus: COMMAND_STATUSES.CANCELLED,
          closePermissionMessage: 'You do not have permission to cancel this command',
          cancelItems: true,
          session,
        }),
      );

      return res.status(200).json(serializeCommand(updatedCommand));
    } catch (error) {
      if (error.statusCode && error.publicMessage) {
        return res.status(error.statusCode).json({ error: error.publicMessage });
      }

      console.error('Erro ao cancelar comanda:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = commandController;
