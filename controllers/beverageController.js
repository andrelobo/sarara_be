const Beverage = require('../models/beverageModel');
const {
  isValidObjectId,
  createNewBeverage,
  updateExistingBeverage,
  removeBeverage,
  getFilteredBeverageHistory,
  getMostLeastSold,
  getNeverSold,
  getChangeHistory,
} = require('../service/beverageService');

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

const ACTIVE_BEVERAGE_FILTER = { deletedAt: null };

const beverageController = {
  createBeverage: async (req, res) => {
    const { name, category, quantity, unit, date } = req.body;

    try {
      const result = await createNewBeverage({ name, category, quantity, unit, date });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(201).json(result.beverage);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create beverage' });
    }
  },

  getAllBeverages: async (req, res) => {
    try {
      const beverages = await Beverage.find(ACTIVE_BEVERAGE_FILTER).exec();
      res.status(200).json(beverages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch beverages' });
    }
  },

  getBeverageById: async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
      const beverage = await Beverage.findOne({ _id: id, ...ACTIVE_BEVERAGE_FILTER }).exec();
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }
      res.status(200).json(beverage);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching beverage by ID' });
    }
  },

  updateBeverage: async (req, res) => {
    const { id } = req.params;
    const { name, category, quantity, unit } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
      const result = await updateExistingBeverage({ id, name, category, quantity, unit });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(200).json(result.beverage);
    } catch (error) {
      res.status(500).json({ error: 'Error updating beverage' });
    }
  },

  deleteBeverage: async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      const result = await removeBeverage(id);
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(200).json({ message: 'Bebida deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar bebida:', error);
      res.status(500).json({ error: 'Erro ao deletar bebida', details: error.message });
    }
  },

  getBeverageHistory: async (req, res) => {
    const { id } = req.params;
    const startDate = req.query.startDate || req.body?.startDate;
    const endDate = req.query.endDate || req.body?.endDate;

    if (!id) {
      return res.status(400).json({ error: 'Beverage ID is required' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      const result = await getFilteredBeverageHistory({ id, startDate, endDate });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(200).json(result.history);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getMostLeastSoldBeverages: async (req, res) => {
    try {
      const result = await getMostLeastSold();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  },

  getNeverSoldBeverages: async (req, res) => {
    try {
      const result = await getNeverSold();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  },

  getChangeHistory: async (req, res) => {
    const startDate = req.query.startDate || req.body?.startDate;
    const endDate = req.query.endDate || req.body?.endDate;

    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      const result = await getChangeHistory({ startDate, endDate });
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = beverageController;
