const mongoose = require('mongoose');
const { Table, TABLE_STATUSES } = require('../models/tableModel');
const { USER_ROLES } = require('../constants/userAccess');
const { appendAuditEntry } = require('../utils/salonAudit');

const ACTIVE_TABLE_FILTER = { deletedAt: null };

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeTableName = (name, fallbackNumber) => {
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }

  return `Mesa ${fallbackNumber}`;
};

const isAllowedTableStatus = (status) => Object.values(TABLE_STATUSES).includes(status);

const findActiveTableById = (id) => Table.findOne({ _id: id, ...ACTIVE_TABLE_FILTER });

const hasDuplicateTableNumber = async (number, ignoreId = null) => {
  const filter = {
    number,
    ...ACTIVE_TABLE_FILTER,
  };

  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }

  const duplicate = await Table.findOne(filter).select('_id');
  return Boolean(duplicate);
};

const createNewTable = async ({ number, name, status, currentUser }) => {
  const normalizedNumber = Number(number);
  if (!Number.isInteger(normalizedNumber) || normalizedNumber < 1) {
    return { error: 'Table number must be a valid positive integer', statusCode: 400 };
  }

  if (status !== undefined && !isAllowedTableStatus(status)) {
    return { error: 'Invalid table status', statusCode: 400 };
  }

  if (await hasDuplicateTableNumber(normalizedNumber)) {
    return { error: 'A table with this number already exists', statusCode: 409 };
  }

  const table = new Table({
    number: normalizedNumber,
    name: normalizeTableName(name, normalizedNumber),
    status: status || TABLE_STATUSES.FREE,
  });

  appendAuditEntry(table, 'table_created', currentUser, {
    number: table.number,
    name: table.name,
    status: table.status,
  });

  const savedTable = await table.save();
  return { table: savedTable };
};

const updateExistingTable = async ({ id, number, name, status, currentUser }) => {
  const table = await findActiveTableById(id);
  if (!table) {
    return { error: 'Table not found', statusCode: 404 };
  }

  const previousState = {
    number: table.number,
    name: table.name,
    status: table.status,
    waiterId: table.waiterId ? String(table.waiterId) : null,
    currentCommandId: table.currentCommandId ? String(table.currentCommandId) : null,
  };

  if (number === undefined && name === undefined && status === undefined) {
    return { error: 'No valid fields were sent for update', statusCode: 400 };
  }

  if (number !== undefined) {
    const normalizedNumber = Number(number);
    if (!Number.isInteger(normalizedNumber) || normalizedNumber < 1) {
      return { error: 'Table number must be a valid positive integer', statusCode: 400 };
    }

    if (await hasDuplicateTableNumber(normalizedNumber, table._id)) {
      return { error: 'A table with this number already exists', statusCode: 409 };
    }

    table.number = normalizedNumber;
  }

  if (name !== undefined) {
    table.name = normalizeTableName(name, table.number);
  }

  if (status !== undefined) {
    if (!isAllowedTableStatus(status)) {
      return { error: 'Invalid table status', statusCode: 400 };
    }

    if (status === TABLE_STATUSES.FREE && table.currentCommandId) {
      return { error: 'Close or cancel the active command before freeing this table', statusCode: 409 };
    }

    table.status = status;

    if (status === TABLE_STATUSES.FREE) {
      table.waiterId = null;
      table.currentCommandId = null;
      table.closedAt = new Date();
    }
  }

  appendAuditEntry(table, 'table_updated', currentUser, {
    from: previousState,
    to: {
      number: table.number,
      name: table.name,
      status: table.status,
      waiterId: table.waiterId ? String(table.waiterId) : null,
      currentCommandId: table.currentCommandId ? String(table.currentCommandId) : null,
    },
  });

  const updatedTable = await table.save();
  return { table: updatedTable };
};

const removeTable = async ({ id, currentUser }) => {
  const table = await findActiveTableById(id);
  if (!table) {
    return { error: 'Table not found', statusCode: 404 };
  }

  if (table.status !== TABLE_STATUSES.FREE) {
    return { error: 'Only free tables can be removed', statusCode: 409 };
  }

  table.deletedAt = new Date();
  appendAuditEntry(table, 'table_deleted', currentUser, {
    number: table.number,
    name: table.name,
  });
  await table.save();

  return { success: true };
};

const openExistingTable = async ({ id, waiterId, currentUser }) => {
  const table = await findActiveTableById(id);
  if (!table) {
    return { error: 'Table not found', statusCode: 404 };
  }

  if (![TABLE_STATUSES.FREE, TABLE_STATUSES.RESERVED].includes(table.status)) {
    return { error: 'Table is not available to open', statusCode: 409 };
  }

  if (table.currentCommandId) {
    return { error: 'This table already has an active command', statusCode: 409 };
  }

  let nextWaiterId = null;
  if (currentUser.role === USER_ROLES.WAITER) {
    nextWaiterId = currentUser._id;
  } else if (waiterId !== undefined && waiterId !== null) {
    if (!isValidObjectId(waiterId)) {
      return { error: 'Invalid waiter ID', statusCode: 400 };
    }
    nextWaiterId = waiterId;
  } else if (table.waiterId) {
    nextWaiterId = table.waiterId;
  }

  const previousStatus = table.status;
  table.status = TABLE_STATUSES.OCCUPIED;
  table.openedAt = new Date();
  table.closedAt = null;
  table.waiterId = nextWaiterId;
  appendAuditEntry(table, 'table_opened', currentUser, {
    previousStatus,
    waiterId: nextWaiterId ? String(nextWaiterId) : null,
  });

  const updatedTable = await table.save();
  return { table: updatedTable };
};

const closeExistingTable = async ({ id, currentUser }) => {
  const table = await findActiveTableById(id);
  if (!table) {
    return { error: 'Table not found', statusCode: 404 };
  }

  if (table.status === TABLE_STATUSES.FREE) {
    return { error: 'Table is already free', statusCode: 409 };
  }

  if (table.currentCommandId) {
    return { error: 'Close or cancel the active command before closing this table', statusCode: 409 };
  }

  const previousStatus = table.status;
  table.status = TABLE_STATUSES.FREE;
  table.closedAt = new Date();
  table.currentCommandId = null;
  table.waiterId = null;
  appendAuditEntry(table, 'table_closed', currentUser, {
    previousStatus,
  });

  const updatedTable = await table.save();
  return { table: updatedTable };
};

module.exports = {
  isValidObjectId,
  findActiveTableById,
  isAllowedTableStatus,
  normalizeTableName,
  hasDuplicateTableNumber,
  createNewTable,
  updateExistingTable,
  removeTable,
  openExistingTable,
  closeExistingTable,
};
