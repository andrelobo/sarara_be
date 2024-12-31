const Beverage = require('../models/beverageModel');
const mongoose = require('mongoose');

const beverageController = {
  createBeverage: async (req, res) => {
    const { name, category, quantity, unit, date } = req.body;

    if (!name || !category || !quantity || !unit) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const creationDate = date ? new Date(date) : new Date();
    const newBeverage = new Beverage({
      name,
      category,
      quantity,
      unit,
      history: [{
        date: creationDate,
        change: 'added',
        quantity,
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
      const beverages = await Beverage.find().exec();
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
      const beverage = await Beverage.findById(id).exec();
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
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    try {
      const beverage = await Beverage.findById(id).exec();
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      const oldQuantity = beverage.quantity;
      const newQuantity = quantity || oldQuantity;

      beverage.set(req.body);
      beverage.history.push({
        date: new Date(),
        change: newQuantity > oldQuantity ? 'added' : 'removed',
        quantity: Math.abs(newQuantity - oldQuantity),
      });

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
      const beverage = await Beverage.findById(id);
      if (!beverage) {
        return res.status(404).json({ error: 'Bebida não encontrada' });
      }

      // Adiciona o registro de histórico
      beverage.history.push({
        date: new Date(),
        change: 'deleted',
        quantity: beverage.quantity,
      });

      // Salva as alterações no histórico
      await beverage.save();

      // Agora podemos deletar a bebida
      await Beverage.findByIdAndDelete(id);

      res.status(200).json({ message: 'Bebida deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar bebida:', error);
      res.status(500).json({ error: 'Erro ao deletar bebida', details: error.message });
    }
  },

  getBeverageHistory: async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    if (!id || !startDate || !endDate) {
      return res.status(400).json({ error: 'Beverage ID, start date, and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      const beverage = await Beverage.findById(id).exec();
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      const filteredHistory = beverage.history.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });

      res.status(200).json(filteredHistory);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getMostLeastSoldBeverages: async (req, res) => {
    try {
      const beverages = await Beverage.aggregate([
        { $unwind: "$history" },
        {
          $group: {
            _id: "$name",
            totalSold: {
              $sum: {
                $cond: [{ $eq: ["$history.change", "sold"] }, "$history.quantity", 0]
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
            history: { $not: { $elemMatch: { change: "sold" } } }
          }
        }
      ]).exec();

      res.status(200).json(beverages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  },

  getChangeHistory: async (req, res) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      const history = await Beverage.aggregate([
        { $unwind: "$history" },
        {
          $match: {
            "history.date": { $gte: start, $lte: end }
          }
        },
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
      ]).exec();

      res.status(200).json(history || []);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = beverageController;
