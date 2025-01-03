const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  change: { 
    type: String, 
    enum: [
      'adicionado', 'removido', 'vendido', 'deletado', // Valores em português
      'added', 'removed', 'sold', 'deleted'           // Valores em inglês
    ], 
    required: true 
  },
  quantity: { type: Number, required: true },
});

const beverageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  history: [historySchema],
});

const Beverage = mongoose.model('Beverage', beverageSchema);

module.exports = Beverage;
