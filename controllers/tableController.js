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

const serializeTable = (tableDocument) => tableDocument;

const tableController = {
  async createTable(req, res) {
    const { number, name, status } = req.body;

    const normalizedNumber = Number(number);
    if (!Number.isInteger(normalizedNumber) || normalizedNumber < 1) {
      return res.status(400).json({ error: 'Table number must be a valid positive integer' });
    }

    if (status !== undefined && !isAllowedTableStatus(status)) {
      return res.status(400).json({ error: 'Invalid table status' });
    }

    try {
      if (await hasDuplicateTableNumber(normalizedNumber)) {
        return res.status(409).json({ error: 'A table with this number already exists' });
      }

      const table = new Table({
        number: normalizedNumber,
        name: normalizeTableName(name, normalizedNumber),
        status: status || TABLE_STATUSES.FREE,
      });

      appendAuditEntry(table, 'table_created', req.currentUser, {
        number: table.number,
        name: table.name,
        status: table.status,
      });

      const savedTable = await table.save();
      return res.status(201).json(serializeTable(savedTable));
    } catch (error) {
      console.error('Erro ao criar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllTables(req, res) {
    try {
      const tables = await Table.find(ACTIVE_TABLE_FILTER).select('-auditTrail').sort({ number: 1, createdAt: 1 });
      return res.status(200).json(tables.map(serializeTable));
    } catch (error) {
      console.error('Erro ao listar mesas:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getTableById(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    try {
      const table = await findActiveTableById(id);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      const previousState = {
        number: table.number,
        name: table.name,
        status: table.status,
        waiterId: table.waiterId ? String(table.waiterId) : null,
        currentCommandId: table.currentCommandId ? String(table.currentCommandId) : null,
      };

      return res.status(200).json(serializeTable(table));
    } catch (error) {
      console.error('Erro ao buscar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateTable(req, res) {
    const { id } = req.params;
    const { number, name, status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    try {
      const table = await findActiveTableById(id);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      if (number === undefined && name === undefined && status === undefined) {
        return res.status(400).json({ error: 'No valid fields were sent for update' });
      }

      if (number !== undefined) {
        const normalizedNumber = Number(number);
        if (!Number.isInteger(normalizedNumber) || normalizedNumber < 1) {
          return res.status(400).json({ error: 'Table number must be a valid positive integer' });
        }

        if (await hasDuplicateTableNumber(normalizedNumber, table._id)) {
          return res.status(409).json({ error: 'A table with this number already exists' });
        }

        table.number = normalizedNumber;
      }

      if (name !== undefined) {
        table.name = normalizeTableName(name, table.number);
      }

      if (status !== undefined) {
        if (!isAllowedTableStatus(status)) {
          return res.status(400).json({ error: 'Invalid table status' });
        }

        if (status === TABLE_STATUSES.FREE && table.currentCommandId) {
          return res.status(409).json({ error: 'Close or cancel the active command before freeing this table' });
        }

        table.status = status;

        if (status === TABLE_STATUSES.FREE) {
          table.waiterId = null;
          table.currentCommandId = null;
          table.closedAt = new Date();
        }
      }

      appendAuditEntry(table, 'table_updated', req.currentUser, {
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
      return res.status(200).json(serializeTable(updatedTable));
    } catch (error) {
      console.error('Erro ao atualizar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteTable(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    try {
      const table = await findActiveTableById(id);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      if (table.status !== TABLE_STATUSES.FREE) {
        return res.status(409).json({ error: 'Only free tables can be removed' });
      }

      table.deletedAt = new Date();
      appendAuditEntry(table, 'table_deleted', req.currentUser, {
        number: table.number,
        name: table.name,
      });
      await table.save();

      return res.status(200).json({ message: 'Table deleted successfully' });
    } catch (error) {
      console.error('Erro ao deletar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async openTable(req, res) {
    const { id } = req.params;
    const { waiterId } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    try {
      const table = await findActiveTableById(id);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      const previousStatus = table.status;

      if (![TABLE_STATUSES.FREE, TABLE_STATUSES.RESERVED].includes(table.status)) {
        return res.status(409).json({ error: 'Table is not available to open' });
      }

      if (table.currentCommandId) {
        return res.status(409).json({ error: 'This table already has an active command' });
      }

      let nextWaiterId = null;
      if (req.currentUser.role === USER_ROLES.WAITER) {
        nextWaiterId = req.currentUser._id;
      } else if (waiterId !== undefined && waiterId !== null) {
        if (!isValidObjectId(waiterId)) {
          return res.status(400).json({ error: 'Invalid waiter ID' });
        }
        nextWaiterId = waiterId;
      } else if (table.waiterId) {
        nextWaiterId = table.waiterId;
      }

      table.status = TABLE_STATUSES.OCCUPIED;
      table.openedAt = new Date();
      table.closedAt = null;
      table.waiterId = nextWaiterId;
      appendAuditEntry(table, 'table_opened', req.currentUser, {
        previousStatus,
        waiterId: nextWaiterId ? String(nextWaiterId) : null,
      });

      const updatedTable = await table.save();
      return res.status(200).json(serializeTable(updatedTable));
    } catch (error) {
      console.error('Erro ao abrir mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async closeTable(req, res) {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid table ID' });
    }

    try {
      const table = await findActiveTableById(id);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }

      const previousStatus = table.status;

      if (table.status === TABLE_STATUSES.FREE) {
        return res.status(409).json({ error: 'Table is already free' });
      }

      if (table.currentCommandId) {
        return res.status(409).json({ error: 'Close or cancel the active command before closing this table' });
      }

      table.status = TABLE_STATUSES.FREE;
      table.closedAt = new Date();
      table.currentCommandId = null;
      table.waiterId = null;
      appendAuditEntry(table, 'table_closed', req.currentUser, {
        previousStatus,
      });

      const updatedTable = await table.save();
      return res.status(200).json(serializeTable(updatedTable));
    } catch (error) {
      console.error('Erro ao fechar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = tableController;
