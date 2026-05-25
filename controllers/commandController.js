const { Command, COMMAND_STATUSES, COMMAND_ITEM_STATUSES } = require('../models/commandModel');
const {
  isValidObjectId,
  resolveCommandItemProduct,
  recalculateCommandTotals,
  findCommandById,
  canOperateOnCommand,
  executeWithOptionalTransaction,
  createCommandForTable,
  finalizeCommand,
  buildCommandFilter,
  addItemToCommand,
  updateItemInCommand,
  serializeCommand,
} = require('../service/commandService');
const { normalizeMoneyValue } = require('../utils/commandRules');

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

    const result = buildCommandFilter({ status, tableId, waiterId, currentUser: req.currentUser });
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    try {
      const commands = await Command.find(result.filter).select('-auditTrail').sort({ openedAt: -1 });
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

      if (!canOperateOnCommand(req.currentUser, command) && req.currentUser.role === 'waiter') {
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
      const result = await addItemToCommand({
        commandId: id,
        productType,
        productId,
        nameSnapshot,
        quantity: normalizedQuantity,
        unitPrice: normalizedUnitPrice,
        notes,
        currentUser: req.currentUser,
      });

      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json(serializeCommand(result.command));
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

    if (quantity === undefined && unitPrice === undefined && notes === undefined && status === undefined) {
      return res.status(400).json({ error: 'No valid fields were sent for update' });
    }

    try {
      const result = await updateItemInCommand({
        commandId: id,
        itemId,
        quantity,
        unitPrice,
        notes,
        status,
        currentUser: req.currentUser,
      });

      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }

      return res.status(200).json(serializeCommand(result.command));
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
