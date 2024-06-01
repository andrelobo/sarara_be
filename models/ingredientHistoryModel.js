const mongoose = require('mongoose');

const ingredientHistorySchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
  },
  action: {
    type: String,
    enum: ['entrada', 'saída'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('IngredientHistory', ingredientHistorySchema);
