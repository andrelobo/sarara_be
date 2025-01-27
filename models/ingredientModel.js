const mongoose = require("mongoose")

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  unitOfMeasurement: { type: String, required: false }, // Changed to optional
  flavorProfile: { type: String },
  shelfLife: { type: String },
  properties: { type: [String] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  history: [
    {
      date: { type: Date, required: true },
      action: { type: String, enum: ["added", "removed", "updated"], required: true }, // Changed enum values
      quantity: { type: Number, required: true },
    },
  ],
})

// Middleware para atualizar a data de modificação
ingredientSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

const Ingredient = mongoose.model("Ingredient", ingredientSchema)

module.exports = Ingredient

