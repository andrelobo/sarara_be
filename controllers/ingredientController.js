const Ingredient = require('../models/ingredientModel');

// Função auxiliar para verificar se o ingrediente existe
const findIngredientById = async (id) => {
  try {
    return await Ingredient.findById(id);
  } catch (error) {
    return null;
  }
};

const ingredientController = {
  // Criar ingrediente
  async createIngredient(req, res) {
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

    if (!name || !category || !quantity || !unit || !unitOfMeasurement) {
      return res.status(400).json({ error: 'Faltam campos a serem preechidos' });
    }

    try {
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
      console.error(error);
      res.status(500).json({ error: error.name === 'ValidationError' ? error.message : 'Internal Server Error' });
    }
  },

  // Obter todos os ingredientes
  async getAllIngredients(req, res) {
    try {
      const ingredients = await Ingredient.find();
      if (!ingredients.length) {
        return res.status(404).json({ error: 'Ingredients not found' });
      }
      res.status(200).json(ingredients);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Obter ingrediente por ID
  async getIngredientById(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }

    try {
      const ingredient = await findIngredientById(id);
      if (!ingredient) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }
      res.status(200).json(ingredient);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Atualizar ingrediente
  async updateIngredient(req, res) {
    const { id } = req.params;
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }

    try {
      const ingredient = await findIngredientById(id);
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
      console.error(error);
      res.status(500).json({ error: error.name === 'ValidationError' ? error.message : 'Internal Server Error' });
    }
  },

  // Deletar ingrediente
  async deleteIngredient(req, res) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }

    try {
      const ingredient = await findIngredientById(id);
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
  },

  // Obter histórico de ingrediente
  async getIngredientHistory(req, res) {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    if (!id || !startDate || !endDate) {
      return res.status(400).json({ error: 'Ingredient ID, start date, and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    try {
      const ingredient = await findIngredientById(id);
      if (!ingredient) {
        return res.status(404).json({ error: 'Ingredient not found' });
      }

      const filteredHistory = ingredient.history.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= start && entryDate <= end;
      });

      res.status(200).json(filteredHistory);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = ingredientController;
