// Importação de módulos necessários
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const beverageRoutes = require('./routes/beverageRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');


// Configuração do servidor Express
const app = express();

// Habilitar CORS para todas as rotas
app.use(cors());

const PORT = process.env.PORT || 7777;

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API Boilerplate Documentation',
            description: 'API Boilerplate Documentation',
            version: '1.0.0',
        },
    },
    apis: ['./routes/*.js'], // Path to the files containing your API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configuração do middleware
app.use(bodyParser.json());

// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Conexão com o MongoDB estabelecida com sucesso');
}).catch((err) => {
    console.error('Erro de conexão com o MongoDB:', err);
    process.exit(1); // Exit the process with failure if MongoDB connection fails
});

app.get('/', (req, res) => {
    res.send('Bem-vindo ao nosso aplicativo!');
});

// Rotas de Usuários
app.use('/api/users', userRoutes);

// Rotas de Ingredientes
app.use('/api/ingredients', ingredientRoutes);

// Rotas de Bebidas
app.use('/api/beverages', beverageRoutes);

// Rota para solicitar redefinição de senha


console.log('Iniciando o servidor...');

// Ponto de entrada para o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

