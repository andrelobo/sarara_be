// controllers/ingredientController.js
const Ingredients = require('../models/ingredientModel');

exports.createIngredient = async (req, res) => {
  try {
    const { body } = req;
    if (!body) {
      return res.status(400).json({ error: 'Ingredient data is required' });
    }
    const ingredient = new Ingredients(body);
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getAllIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredients.find();
    if (!ingredients) {
      return res.status(404).json({ error: 'Ingredients not found' });
    }
    res.status(200).json(ingredients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getIngredientById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }
    const ingredient = await Ingredients.findById(id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.status(200).json(ingredient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    if (!id || !body) {
      return res.status(400).json({ error: 'Ingredient ID and data are required' });
    }
    const ingredient = await Ingredients.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.status(200).json(ingredient);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid ingredient ID' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }
    const ingredient = await Ingredients.findByIdAndDelete(id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }
    res.status(200).json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

