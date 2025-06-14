// routes/buscar.js
const express = require('express');
const router = express.Router();

const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Objeto = require('../models/model_objetos');
const Evento = require('../models/model_eventos');
const Generacion = require('../models/model_generaciones');

// Normaliza y quita tildes
function normalizeStr(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // quita tildes
        .replace(/[^a-z0-9\s]/g, '');      // quita puntuación
}

router.get('/', async (req, res) => {
    const qRaw = req.query.q;
    console.log(`🔍 [ROUTE] GET /api/buscar?q=${qRaw}`);
    if (!qRaw) {
        console.log('⚠️ [ERROR] Falta parámetro q');
        return res.status(400).json({ error: 'Falta parámetro q' });
    }

    const qNorm = normalizeStr(qRaw);

    try {
        // Cargar todo y filtrar en memoria
        const [todosPers, todosLug, todosObj, todosGen, todosEvt] = await Promise.all([
            Personaje.find({}, 'nombre descripcion'),
            Lugar.find({}, 'nombre descripcion'),
            Objeto.find({}, 'nombre descripcion'),
            Generacion.find({}, 'nombre descripcion'),
            Evento.find({}, 'nombre descripcion personajes_involucrados lugar_relacionado generacion_relacionada')
        ]);

        const personajes = todosPers.filter(p => normalizeStr(p.nombre).includes(qNorm));
        const lugares = todosLug.filter(l => normalizeStr(l.nombre).includes(qNorm));
        const objetos = todosObj.filter(o => normalizeStr(o.nombre).includes(qNorm));
        const generaciones = todosGen.filter(g => normalizeStr(g.nombre).includes(qNorm));
        const eventos = todosEvt.filter(e =>
            normalizeStr(e.nombre).includes(qNorm) ||
            normalizeStr(e.descripcion).includes(qNorm)
        );

        console.log('✅ [RESULTS]',
            `personajes=${personajes.length}`,
            `lugares=${lugares.length}`,
            `objetos=${objetos.length}`,
            `generaciones=${generaciones.length}`,
            `eventos=${eventos.length}`
        );
        return res.json({ personajes, lugares, objetos, generaciones, eventos });

    } catch (error) {
        console.error('❌ [ERROR] en /api/buscar:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
