const Ingredient = require('../models/ingredientModel');
const {
  isValidObjectId,
  findIngredientById,
  createNewIngredient,
  updateExistingIngredient,
  removeIngredient,
} = require('../service/ingredientService');

const ingredientController = {
  createIngredient: async (req, res) => {
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

    try {
      const result = await createNewIngredient({
        name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties,
      });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(201).json(result.ingredient);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.name === 'ValidationError' ? error.message : 'Erro interno do servidor' });
    }
  },

  updateIngredient: async (req, res) => {
    const { id } = req.params;
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID de ingrediente invalido' });
    }

    try {
      const result = await updateExistingIngredient({
        id, name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties,
      });
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(200).json(result.ingredient);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.name === 'ValidationError' ? error.message : 'Erro interno do servidor' });
    }
  },

  getAllIngredients: async (req, res) => {
    try {
      const ingredients = await Ingredient.find();
      res.status(200).json(ingredients);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar ingredientes' });
    }
  },

  getIngredientById: async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID de ingrediente invalido' });
    }

    try {
      const ingredient = await findIngredientById(id);
      if (!ingredient) {
        return res.status(404).json({ error: 'Ingrediente não encontrado' });
      }
      res.status(200).json(ingredient);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar ingrediente' });
    }
  },

  deleteIngredient: async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID de ingrediente invalido' });
    }

    try {
      const result = await removeIngredient(id);
      if (result.error) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      res.status(200).json({ message: 'Ingrediente deletado com sucesso' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar ingrediente' });
    }
  },

  getIngredientHistory: async (req, res) => {
    try {
      const ingredients = await Ingredient.find({}, { history: 1, name: 1 });
      res.status(200).json(ingredients);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar histórico de alterações' });
    }
  },
};

module.exports = ingredientController;
