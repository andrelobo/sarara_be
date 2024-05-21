const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
});

// Método para verificar se a senha fornecida é válida
userSchema.methods.isValidPassword = async function(candidatePassword) {
  if (!this || !this.password || !candidatePassword) {
    throw new Error('Null pointer reference');
  }
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    throw error; // Rejeita a promessa se ocorrer um erro na comparação
  }
};

const User = model('User', userSchema);

module.exports = User;
