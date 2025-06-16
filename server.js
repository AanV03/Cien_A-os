/**
 * @fileoverview Servidor principal de la aplicación.
 * 
 * Configura Express, conecta a MongoDB, aplica middlewares,
 * define las rutas de la API y sirve el frontend.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

console.log('[INFO] Iniciando servidor...');

// Rutas importadas
console.log('[INFO] Importando rutas...');
const preguntasRouter = require('./routes/preguntas');
const buscarRouter = require('./routes/buscar');
const eventosRouter = require('./routes/eventos');
const personajesRouter = require('./routes/personajes');
const lugaresRouter = require('./routes/lugares');
const generacionesRouter = require('./routes/generaciones');
const objetosRouter = require('./routes/objetos');

// Crear app de Express
const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// Middlewares globales
// ----------------------

console.log('[INFO] Aplicando middlewares...');
app.use(cors()); // Permite CORS
app.use(express.json()); // Permite recibir JSON en las solicitudes

// ----------------------
// Conexión a MongoDB Atlas
// ----------------------

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

// ----------------------
// Rutas de la API
// ----------------------

console.log('[INFO] Cargando rutas de API...');

// Log específico para cada solicitud a /preguntas
app.use('/api/preguntas', (req, res, next) => {
    console.log(`[ROUTE] /api/preguntas - Método: ${req.method}`);
    next();
}, preguntasRouter);

app.use('/api/buscar', buscarRouter);
app.use('/api/eventos', eventosRouter);
app.use('/api/personajes', personajesRouter);
app.use('/api/lugares', lugaresRouter);
app.use('/api/generaciones', generacionesRouter);
app.use('/api/objetos', objetosRouter);

// ----------------------
// Servir frontend
// ----------------------

console.log('[INFO] Configurando archivos estáticos desde /public...');
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Ruta dedicada para servir el HTML principal de la aplicación.
 */
app.get('/main', (req, res) => {
    console.log('[ROUTE] /main - Enviando Main.html');
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// ----------------------
// Iniciar el servidor
// ----------------------

/**
 * Inicia el servidor en el puerto especificado (por env o por defecto).
 */
app.listen(PORT, () => {
    console.log(`[SUCCESS] Servidor escuchando en http://localhost:${PORT}`);
});
