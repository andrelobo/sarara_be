// api/models/beverageModel.js

const mongoose = require('mongoose');

// Definindo o esquema para o modelo de bebida
const beverageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    unit: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Criando o modelo de bebida
const Beverage = mongoose.model('Beverage', beverageSchema);

module.exports = Beverage;

