const mongoose = require('mongoose');

const beverageHistorySchema = new mongoose.Schema({
  beverageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beverage',
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

module.exports = mongoose.model('BeverageHistory', beverageHistorySchema);
