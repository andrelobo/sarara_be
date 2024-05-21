// models/Ingredient.js
const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String,
     required: true },
  quantity: { type: Number, 
    required: true },
  unit: { type: String, 
    required: true },
  category: { type: String, 
    required: true },
  createdAt: { type: Date,
     default: Date.now }
});

module.exports = mongoose.model('Ingredient', ingredientSchema);
