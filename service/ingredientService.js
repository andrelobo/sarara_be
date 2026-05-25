const mongoose = require('mongoose');
const Ingredient = require('../models/ingredientModel');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findIngredientById = async (id) => {
  try {
    return await Ingredient.findById(id);
  } catch (error) {
    return null;
  }
};

const createNewIngredient = async ({ name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties }) => {
  if (!name || !category || quantity === undefined || quantity === null || !unit) {
    return { error: 'Faltam campos obrigatórios', statusCode: 400 };
  }

  const normalizedQuantity = Number(quantity);
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity < 0) {
    return { error: 'Quantidade deve ser um numero valido e nao negativo', statusCode: 400 };
  }

  const ingredient = new Ingredient({
    name,
    category,
    quantity: normalizedQuantity,
    unit,
    unitOfMeasurement,
    flavorProfile,
    shelfLife,
    properties,
    history: [
      {
        date: new Date(),
        action: 'added',
        quantity: normalizedQuantity,
      },
    ],
  });

  const savedIngredient = await ingredient.save();
  return { ingredient: savedIngredient };
};

const updateExistingIngredient = async ({ id, name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties }) => {
  const ingredient = await findIngredientById(id);
  if (!ingredient) {
    return { error: 'Ingrediente não encontrado', statusCode: 404 };
  }

  const oldQuantity = ingredient.quantity;
  const hasQuantityUpdate = quantity !== undefined;
  const newQuantity = hasQuantityUpdate ? Number(quantity) : oldQuantity;

  if (hasQuantityUpdate && (!Number.isFinite(newQuantity) || newQuantity < 0)) {
    return { error: 'Quantidade deve ser um numero valido e nao negativo', statusCode: 400 };
  }

  if (name !== undefined) ingredient.name = name;
  if (category !== undefined) ingredient.category = category;
  if (unit !== undefined) ingredient.unit = unit;
  ingredient.quantity = newQuantity;
  if (unitOfMeasurement !== undefined) ingredient.unitOfMeasurement = unitOfMeasurement;
  if (flavorProfile !== undefined) ingredient.flavorProfile = flavorProfile;
  if (shelfLife !== undefined) ingredient.shelfLife = shelfLife;
  if (properties !== undefined) ingredient.properties = properties;

  if (newQuantity !== oldQuantity) {
    ingredient.history.push({
      date: new Date(),
      action: newQuantity > oldQuantity ? 'added' : 'removed',
      quantity: Math.abs(newQuantity - oldQuantity),
    });
  }

  const updatedIngredient = await ingredient.save();
  return { ingredient: updatedIngredient };
};

const removeIngredient = async (id) => {
  const ingredient = await findIngredientById(id);
  if (!ingredient) {
    return { error: 'Ingrediente não encontrado', statusCode: 404 };
  }

  await ingredient.deleteOne();
  return { success: true };
};

module.exports = {
  isValidObjectId,
  findIngredientById,
  createNewIngredient,
  updateExistingIngredient,
  removeIngredient,
};
