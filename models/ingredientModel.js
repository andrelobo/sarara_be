const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Nome do ingrediente (ex: "Limão", "Açúcar")
  category: { type: String, required: true }, // Categoria do ingrediente (ex: "Fruta", "Especiaria", "Produto Químico")
  quantity: { type: Number, required: true }, // Quantidade em estoque
  unit: { type: String, required: true }, // Unidade padrão do ingrediente (ex: "g", "ml", "unidade")
  unitOfMeasurement: { type: String, required: true }, // Unidade de medida usada para estoque (ex: "g", "ml", "unidade")
  flavorProfile: { type: String }, // Perfil de sabor (opcional, ex: "ácido", "doce")
  shelfLife: { type: String }, // Prazo de validade (opcional, ex: "3 dias", "6 meses")
  properties: { type: [String] }, // Propriedades adicionais (opcional, ex: ["refrescante", "anti-inflamatório"])
  createdAt: { type: Date, default: Date.now }, // Data de criação do registro
  updatedAt: { type: Date, default: Date.now }, // Última atualização
  history: [ // Histórico de alterações no estoque
    {
      date: { type: Date, required: true },
      action: { type: String, enum: ['adicionado', 'removido', 'atualizado'], required: true }, // Tipo de alteração
      quantity: { type: Number, required: true }, // Quantidade alterada
    },
  ],
});

// Middleware para atualizar a data de modificação
ingredientSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;
