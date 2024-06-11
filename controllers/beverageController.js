// controllers/beverageController.js

const Beverage = require('../models/beverageModel');

const beverageController = {
  createBeverage: async (req, res) => {
    try {
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

      const savedBeverage = await newBeverage.save();
      res.status(201).json(savedBeverage);
    } catch (error) {
      console.error('Error creating beverage:', error);
      res.status(500).json({ error: 'Failed to create beverage' });
    }
  },

  getAllBeverages: async (req, res) => {
    try {
      const beverages = await Beverage.find();
      res.status(200).json(beverages);
    } catch (error) {
      console.error('Error fetching beverages:', error);
      res.status(500).json({ error: 'Failed to fetch beverages' });
    }
  },

  getBeverageById: async (req, res) => {
    try {
      const { id } = req.params;
      const beverage = await Beverage.findById(id).lean();
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }
      res.status(200).json(beverage);
    } catch (error) {
      console.error('Error fetching beverage by ID:', error);
      res.status(500).json({ error: 'Error fetching beverage by ID' });
    }
  },

  updateBeverage: async (req, res) => {
    try {
      const { id } = req.params;
      const beverage = await Beverage.findById(id);
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      const oldQuantity = beverage.quantity;
      const newQuantity = req.body.quantity || oldQuantity;

      beverage.set(req.body);
      beverage.history.push({
        date: new Date(),
        change: newQuantity > oldQuantity ? 'added' : 'removed',
        quantity: Math.abs(newQuantity - oldQuantity),
      });

      const updatedBeverage = await beverage.save();
      res.status(200).json(updatedBeverage);
    } catch (error) {
      console.error('Error updating beverage:', error);
      res.status(500).json({ error: 'Error updating beverage' });
    }
  },

  deleteBeverage: async (req, res) => {
    try {
      const { id } = req.params;
      const beverage = await Beverage.findByIdAndDelete(id);
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      beverage.history.push({
        date: new Date(),
        change: 'deleted',
        quantity: beverage.quantity,
      });

      await beverage.save();
      res.status(200).json({ message: 'Beverage deleted successfully' });
    } catch (error) {
      console.error('Error deleting beverage:', error);
      res.status(500).json({ error: 'Error deleting beverage' });
    }
  },

  getBeverageHistoryByDate: async (req, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const beverage = await Beverage.findById(id);
      if (!beverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }

      const filteredHistory = beverage.history.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
      });

      res.status(200).json(filteredHistory);
    } catch (error) {
      console.error('Error fetching beverage history by date:', error);
      res.status(500).json({ error: 'Error fetching beverage history by date' });
    }
  },
};

module.exports = beverageController;
