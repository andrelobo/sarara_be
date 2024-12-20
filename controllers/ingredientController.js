const Ingredient = require('../models/ingredientModel');

exports.createIngredient = async (req, res) => {
  try {
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

    if (!name || !category || !quantity || !unit || !unitOfMeasurement) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ingredient = new Ingredient({
      name,
      category,
      quantity,
      unit,
      unitOfMeasurement,
      flavorProfile,
      shelfLife,
      properties,
      history: [{
        date: new Date(),
        action: 'added',
        quantity,
      }],
    });

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
    const ingredients = await Ingredient.find();
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
    const ingredient = await Ingredient.findById(id);
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
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }

    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    const oldQuantity = ingredient.quantity;
    const newQuantity = quantity || oldQuantity;

    ingredient.name = name || ingredient.name;
    ingredient.category = category || ingredient.category;
    ingredient.quantity = newQuantity;
    ingredient.unit = unit || ingredient.unit;
    ingredient.unitOfMeasurement = unitOfMeasurement || ingredient.unitOfMeasurement;
    ingredient.flavorProfile = flavorProfile || ingredient.flavorProfile;
    ingredient.shelfLife = shelfLife || ingredient.shelfLife;
    ingredient.properties = properties || ingredient.properties;

    ingredient.history.push({
      date: new Date(),
      action: newQuantity > oldQuantity ? 'added' : 'removed',
      quantity: Math.abs(newQuantity - oldQuantity),
    });

    await ingredient.save();
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
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    ingredient.history.push({
      date: new Date(),
      action: 'removed',
      quantity: ingredient.quantity,
    });

    await Ingredient.findByIdAndDelete(id);
    res.status(200).json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
