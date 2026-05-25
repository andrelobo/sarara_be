const { Table } = require('../models/tableModel');
const {
  isValidObjectId,
  findActiveTableById,
  createNewTable,
  updateExistingTable,
  removeTable,
  openExistingTable,
  closeExistingTable,
} = require('../service/tableService');

const ACTIVE_TABLE_FILTER = { deletedAt: null };

const tableController = {
  async createTable(req, res) {
    const { number, name, status } = req.body;

    try {
      const result = await createNewTable({ number, name, status, currentUser: req.currentUser });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(201).json(result.table);
    } catch (error) {
      console.error('Erro ao criar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getAllTables(req, res) {
    try {
      const tables = await Table.find(ACTIVE_TABLE_FILTER).select('-auditTrail').sort({ number: 1, createdAt: 1 });
      return res.status(200).json(tables);
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
      return res.status(200).json(table);
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
      const result = await updateExistingTable({ id, number, name, status, currentUser: req.currentUser });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(200).json(result.table);
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
      const result = await removeTable({ id, currentUser: req.currentUser });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
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
      const result = await openExistingTable({ id, waiterId, currentUser: req.currentUser });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(200).json(result.table);
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
      const result = await closeExistingTable({ id, currentUser: req.currentUser });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(200).json(result.table);
    } catch (error) {
      console.error('Erro ao fechar mesa:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = tableController;
