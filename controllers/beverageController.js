// controllers/beverageController.js

const Beverage = require('../models/beverageModel');

const beverageController = {
  createBeverage: async (req, res) => {
    try {
      const { name, category, quantity, unit } = req.body;
      if (!name || !category || !quantity || !unit) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const savedBeverage = await Beverage.create(req.body);
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
      const updatedBeverage = await Beverage.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedBeverage) {
        return res.status(404).json({ error: 'Beverage not found' });
      }
      res.status(200).json(updatedBeverage);
    } catch (error) {
      console.error('Error updating beverage:', error);
      res.status(500).json({ error: 'Error updating beverage' });
    }
  },

  deleteBeverage: async (req, res) => {
    try {
      const { id } = req.params;
      await Beverage.findByIdAndDelete(id);
      res.status(200).json({ message: 'Beverage deleted successfully' });
    } catch (error) {
      console.error('Error deleting beverage:', error);
      res.status(500).json({ error: 'Error deleting beverage' });
    }
  },
};

module.exports = beverageController;

