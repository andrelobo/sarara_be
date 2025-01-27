const Ingredient = require('../models/ingredientModel');

// Função auxiliar para verificar se o ingrediente existe
const findIngredientById = async (id) => {
  try {
    return await Ingredient.findById(id);
  } catch (error) {
    return null;
  }
};

// Função para criar um novo ingrediente
const createIngredient = async (req, res) => {
  const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

  // Validação dos campos obrigatórios
  if (!name || !category || !quantity || !unit) {
    return res.status(400).json({ error: 'Faltam campos obrigatórios' });
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
      history: [
        {
          date: new Date(),
          action: 'added',
          quantity,
        },
      ],
    });

    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.name === 'ValidationError' ? error.message : 'Erro interno do servidor' });
  }
};

// Função para atualizar um ingrediente existente
const updateIngredient = async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'ID do ingrediente é obrigatório' });
  }

  try {
    const ingredient = await findIngredientById(id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingrediente não encontrado' });
    }

    const oldQuantity = ingredient.quantity;
    const newQuantity = quantity !== undefined ? quantity : oldQuantity;

    // Atualiza os campos do ingrediente
    ingredient.name = name || ingredient.name;
    ingredient.category = category || ingredient.category;
    ingredient.quantity = newQuantity;
    ingredient.unit = unit || ingredient.unit;
    if (unitOfMeasurement !== undefined) ingredient.unitOfMeasurement = unitOfMeasurement;
    if (flavorProfile !== undefined) ingredient.flavorProfile = flavorProfile;
    if (shelfLife !== undefined) ingredient.shelfLife = shelfLife;
    if (properties !== undefined) ingredient.properties = properties;

    // Adiciona uma entrada ao histórico se a quantidade mudar
    if (newQuantity !== oldQuantity) {
      ingredient.history.push({
        date: new Date(),
        action: newQuantity > oldQuantity ? 'added' : 'removed',
        quantity: Math.abs(newQuantity - oldQuantity),
      });
    }

    await ingredient.save();
    res.status(200).json(ingredient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.name === 'ValidationError' ? error.message : 'Erro interno do servidor' });
  }
};

// Função para obter todos os ingredientes
const getAllIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find();
    res.status(200).json(ingredients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar ingredientes' });
  }
};

// Função para obter um ingrediente por ID
const getIngredientById = async (req, res) => {
  const { id } = req.params;

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
};

// Função para deletar um ingrediente
const deleteIngredient = async (req, res) => {
  const { id } = req.params;

  try {
    const ingredient = await findIngredientById(id);
    if (!ingredient) {
      return res.status(404).json({ error: 'Ingrediente não encontrado' });
    }

    await ingredient.remove();
    res.status(200).json({ message: 'Ingrediente deletado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar ingrediente' });
  }
};

// Função para obter o histórico de alterações de um ingrediente
const getIngredientHistory = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({}, { history: 1, name: 1 });
    res.status(200).json(ingredients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar histórico de alterações' });
  }
};

// Exportação das funções do controlador
module.exports = {
  createIngredient,
  updateIngredient,
  getAllIngredients,
  getIngredientById,
  deleteIngredient,
  getIngredientHistory,
};