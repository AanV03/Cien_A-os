// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

console.log('[INFO] Iniciando servidor...');

// Importar rutas
console.log('[INFO] Importando rutas...');
const preguntasRouter = require('./routes/preguntas');
const buscarRoute = require('./routes/buscar');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
console.log('[INFO] Aplicando middlewares...');
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
console.log('[INFO] Conectando a MongoDB...');
mongoose.connect(
    'mongodb+srv://jamaica:Dac9YCa5Y72jKrq@cluster0.5djxdgh.mongodb.net/DB_100_años',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)
    .then(() => console.log('[SUCCESS] Conectado a MongoDB'))
    .catch(err => console.error('[ERROR] Error al conectar a MongoDB:', err));

// Rutas de API
console.log('[INFO] Cargando rutas de API...');


app.use('/api/preguntas', (req, res, next) => {
    console.log(`[ROUTE] /api/preguntas - Método: ${req.method}`);
    next();
}, preguntasRouter);


app.use('/api/buscar', buscarRoute);

// Servir archivos estáticos
console.log('[INFO] Configurando archivos estáticos desde /public...');
app.use(express.static(path.join(__dirname, 'public')));

// Ruta específica (opcional)
app.get('/main', (req, res) => {
    console.log('[ROUTE] /main - Enviando Cien_anos.html');
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`[SUCCESS] Servidor escuchando en http://localhost:${PORT}`);
});
