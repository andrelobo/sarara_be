const Ingredient = require("../models/ingredientModel")

// Função auxiliar para verificar se o ingrediente existe
const findIngredientById = async (id) => {
  try {
    return await Ingredient.findById(id)
  } catch (error) {
    return null
  }
}

const ingredientController = {
  // Criar ingrediente
  async createIngredient(req, res) {
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body

    if (!name || !category || !quantity || !unit) {
      return res.status(400).json({ error: "Faltam campos obrigatórios" })
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
            action: "added",
            quantity,
          },
        ],
      })

      await ingredient.save()
      res.status(201).json(ingredient)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.name === "ValidationError" ? error.message : "Internal Server Error" })
    }
  },

  // Atualizar ingrediente
  async updateIngredient(req, res) {
    const { id } = req.params
    const { name, category, quantity, unit, unitOfMeasurement, flavorProfile, shelfLife, properties } = req.body

    if (!id) {
      return res.status(400).json({ error: "Ingredient ID is required" })
    }

    try {
      const ingredient = await findIngredientById(id)
      if (!ingredient) {
        return res.status(404).json({ error: "Ingredient not found" })
      }

      const oldQuantity = ingredient.quantity
      const newQuantity = quantity !== undefined ? quantity : oldQuantity

      ingredient.name = name || ingredient.name
      ingredient.category = category || ingredient.category
      ingredient.quantity = newQuantity
      ingredient.unit = unit || ingredient.unit
      if (unitOfMeasurement !== undefined) ingredient.unitOfMeasurement = unitOfMeasurement
      if (flavorProfile !== undefined) ingredient.flavorProfile = flavorProfile
      if (shelfLife !== undefined) ingredient.shelfLife = shelfLife
      if (properties !== undefined) ingredient.properties = properties

      if (newQuantity !== oldQuantity) {
        ingredient.history.push({
          date: new Date(),
          action: newQuantity > oldQuantity ? "added" : "removed",
          quantity: Math.abs(newQuantity - oldQuantity),
        })
      }

      await ingredient.save()
      res.status(200).json(ingredient)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: error.name === "ValidationError" ? error.message : "Internal Server Error" })
    }
  },

  // ... (other methods remain unchanged)
}

module.exports = ingredientController

