const Beverage = require('../models/beverageModel');
const mongoose = require('mongoose');

const ACTIVE_BEVERAGE_FILTER = { deletedAt: null };

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());

const buildDateRange = (startDate, endDate) => {
  const range = {};

  if (startDate) {
    range.$gte = new Date(startDate);
  }

  if (endDate) {
    range.$lte = new Date(endDate);
  }

  return Object.keys(range).length > 0 ? range : null;
};

const beverageController = {
  createBeverage: async (req, res) => {
    const { name, category, quantity, unit, date } = req.body;

    if (!name || !category || quantity === undefined || quantity === null || !unit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedQuantity = Number(quantity);
    if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a valid non-negative number' });
    }

    const creationDate = date ? new Date(date) : new Date();
    const newBeverage = new Beverage({
      name,
      category,
      quantity: normalizedQuantity,
      unit,
      history: [{
        date: creationDate,
        change: 'added',
        quantity: normalizedQuantity,
      }],
    });

    try {
      const savedBeverage = await newBeverage.save();
      res.status(201).json(savedBeverage);
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
      const beverage = await Beverage.findOne({ _id: id, ...ACTIVE_BEVERAGE_FILTER }).exec();
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      if (name === undefined && category === undefined && quantity === undefined && unit === undefined) {
        return res.status(400).json({ error: 'No valid fields provided for update' });
      }

      const oldQuantity = beverage.quantity;
      const hasQuantityUpdate = quantity !== undefined;
      const newQuantity = hasQuantityUpdate ? Number(quantity) : oldQuantity;

      if (hasQuantityUpdate && (!Number.isFinite(newQuantity) || newQuantity < 0)) {
        return res.status(400).json({ error: 'Quantity must be a valid non-negative number' });
      }

      if (name !== undefined) {
        beverage.name = name;
      }

      if (category !== undefined) {
        beverage.category = category;
      }

      if (unit !== undefined) {
        beverage.unit = unit;
      }

      if (hasQuantityUpdate) {
        beverage.quantity = newQuantity;
      }

      if (hasQuantityUpdate && newQuantity !== oldQuantity) {
        beverage.history.push({
          date: new Date(),
          change: newQuantity > oldQuantity ? 'added' : 'removed',
          quantity: Math.abs(newQuantity - oldQuantity),
        });
      }

      const updatedBeverage = await beverage.save();
      res.status(200).json(updatedBeverage);
    } catch (error) {
      res.status(500).json({ error: 'Error updating beverage' });
    }
  },

  deleteBeverage: async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      const beverage = await Beverage.findOne({ _id: id, ...ACTIVE_BEVERAGE_FILTER });
      if (!beverage) {
        return res.status(404).json({ error: 'Bebida não encontrada' });
      }

      // Adiciona o registro de histórico
      beverage.history.push({
        date: new Date(),
        change: 'deleted',
        quantity: beverage.quantity,
      });
      beverage.deletedAt = new Date();

      // Salva as alterações no histórico e marca a exclusão lógica
      await beverage.save();

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      const beverage = await Beverage.findById(id).exec();
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      const dateRange = buildDateRange(startDate, endDate);
      const filteredHistory = beverage.history.filter((entry) => {
        if (!dateRange) {
          return true;
        }

        const entryDate = new Date(entry.date);
        if (dateRange.$gte && entryDate < dateRange.$gte) {
          return false;
        }
        if (dateRange.$lte && entryDate > dateRange.$lte) {
          return false;
        }
        return true;
      });

      res.status(200).json(filteredHistory);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getMostLeastSoldBeverages: async (req, res) => {
    try {
      const beverages = await Beverage.aggregate([
        { $match: ACTIVE_BEVERAGE_FILTER },
        { $unwind: "$history" },
        {
          $group: {
            _id: "$name",
            totalSold: {
              $sum: {
                $cond: [
                  { $in: ["$history.change", ["sold", "removed", "vendido", "removido"]] },
                  "$history.quantity",
                  0
                ]
              }
            }
          }
        },
        { $sort: { totalSold: -1 } },
        { $facet: {
            mostSold: [{ $limit: 5 }],
            leastSold: [{ $sort: { totalSold: 1 } }, { $limit: 5 }]
          }
        }
      ]).exec();

      res.status(200).json(beverages[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  },

  getNeverSoldBeverages: async (req, res) => {
    try {
      const beverages = await Beverage.aggregate([
        {
          $match: {
            deletedAt: null,
            history: { $not: { $elemMatch: { change: { $in: ["sold", "removed", "vendido", "removido"] } } } }
          }
        }
      ]).exec();

      res.status(200).json(beverages);
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
      const dateRange = buildDateRange(startDate, endDate);
      const pipeline = [
        { $unwind: "$history" },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$history.date" } },
              name: "$name"
            },
            totalChange: { $sum: "$history.quantity" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ];

      if (dateRange) {
        pipeline.splice(1, 0, {
          $match: {
            "history.date": dateRange
          }
        });
      }

      const history = await Beverage.aggregate(pipeline).exec();

      res.status(200).json(history || []);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = beverageController;
