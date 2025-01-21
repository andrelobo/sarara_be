// Importação de módulos necessários
require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const compression = require('compression'); // Adicionado para compactar as respostas
const helmet = require('helmet'); // Adicionado para melhorar a segurança
const morgan = require('morgan'); // Adicionado para logs HTTP
const userRoutes = require('./routes/userRoutes');
const beverageRoutes = require('./routes/beverageRoutes');
const ingredientRoutes = require('./routes/ingredientRoutes');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuração do servidor Express
const app = express();
const PORT = process.env.PORT || 7777;

// Configuração de logs HTTP para monitoramento
app.use(morgan('tiny')); // Exibe logs simples no console

// Habilitar CORS para todas as rotas com configurações específicas
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // Ajuste a origem conforme necessário
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Cabeçalhos permitidos
}));

// Configuração do Swagger para documentação
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API Boilerplate Documentation',
            description: 'API Boilerplate Documentation',
            version: '1.0.0',
        },
    },
    apis: ['./routes/*.js'], // Caminho para os arquivos contendo as rotas
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configuração do middleware
app.use(bodyParser.json());
app.use(compression()); // Compacta as respostas para melhorar o desempenho em redes lentas
app.use(helmet()); // Adiciona cabeçalhos de segurança para proteger contra vulnerabilidades

// Conexão com o MongoDB com configuração otimizada
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Tempo limite para seleção do servidor MongoDB
    socketTimeoutMS: 45000, // Tempo limite para soquete MongoDB
}).then(() => {
    console.log('Conexão com o MongoDB estabelecida com sucesso');
}).catch((err) => {
    console.error('Erro de conexão com o MongoDB:', err);
    process.exit(1); // Encerra o processo se a conexão falhar
});

// Rota inicial
app.get('/', (req, res) => {
    res.send('Bem-vindo ao nosso aplicativo!');
});

// Rotas de Usuários
app.use('/api/users', userRoutes);

// Rotas de Ingredientes
app.use('/api/ingredients', ingredientRoutes);

// Rotas de Bebidas
app.use('/api/beverages', beverageRoutes);

// Middleware de tratamento de erros para capturar exceções
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Ocorreu um erro interno no servidor' });
});

// Middleware para lidar com rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada' });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
