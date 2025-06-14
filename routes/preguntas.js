// routes/preguntas.js
// Lógica avanzada de preguntas con NLP y manejo de capítulos
const express = require('express');
const router = express.Router();
const { analizarPregunta } = require('../nlpProcessor');
const Capitulo = require('../models/model_capitulos');
const Evento = require('../models/model_eventos');
const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Generacion = require('../models/model_generaciones');

router.get('/', async (req, res) => {
    const q = req.query.q?.trim();
    console.log(`🔍 [ROUTE] GET /api/preguntas?q=${q}`);
    if (!q) {
        console.log('⚠️ [ERROR] Falta parámetro "q"');
        return res.status(400).json({ error: 'Falta parámetro "q"' });
    }

    const analisis = await analizarPregunta(q);
    const { capitulo, verbos, personajes, lugares, fuzzy } = analisis;
    console.log('🔎 [ANALYSIS]', analisis);

    try {
        // 1) Si detectó capítulo explícito, devolvemos sus eventos
        if (capitulo) {
            const capDoc = await Capitulo.findOne({ numero: capitulo });
            if (!capDoc) {
                console.log('❌ [ERROR] Capítulo no existe');
                return res.status(404).json({ error: 'Capítulo no existe' });
            }
            await capDoc.populate({
                path: 'eventos',
                populate: [
                    { path: 'personajes_involucrados' },
                    { path: 'lugar_relacionado' },
                    { path: 'generacion_relacionada' }
                ]
            });
            console.log('✅ [RESULTS] eventos capítulo', capitulo, capDoc.eventos.length);
            return res.json({ capitulo, resultados: capDoc.eventos });
        }

        // 2) Si se encontró un evento similar usando fuzzy, lo devolvemos
        if (fuzzy) {
            console.log('🎯 [FUZZY] Evento similar encontrado con fuzzy search');
            await fuzzy.populate([
                { path: 'personajes_involucrados' },
                { path: 'lugar_relacionado' },
                { path: 'generacion_relacionada' }
            ]);
            return res.json({ capitulo: 'similar', resultados: [fuzzy] });
        }

        // 3) Obtener IDs de entidades detectadas
        let personajeIds = [];
        if (personajes.length) {
            const docs = await Personaje.find({ nombre: { $in: personajes.map(p => new RegExp(p, 'i')) } }, '_id');
            personajeIds = docs.map(d => d._id);
        }
        let lugarIds = [];
        if (lugares.length) {
            const docs = await Lugar.find({ nombre: { $in: lugares.map(l => new RegExp(l, 'i')) } }, '_id');
            lugarIds = docs.map(d => d._id);
        }
        console.log('🔢 [IDs] personajes:', personajeIds, 'lugares:', lugarIds);

        // 4) Si no hay verbo, entidad ni capítulo, devolver sin resultados
        if (verbos.length === 0 && personajes.length === 0 && lugares.length === 0) {
            console.log('🔤 [FILTER] No hay verbo ni entidad detectada -> 0 resultados');
            return res.json({ capitulo: 'todos', resultados: [] });
        }

        // 5) Construir filtro para eventos
        let filtro = {};
        const andConds = [];
        if (verbos.length) {
            const verbRegex = verbos.map(v => new RegExp(v, 'i'));
            andConds.push({
                $or: [
                    ...verbRegex.map(r => ({ descripcion: r })),
                    ...verbRegex.map(r => ({ nombre: r }))
                ]
            });
        }
        if (personajeIds.length) andConds.push({ personajes_involucrados: { $in: personajeIds } });
        if (lugarIds.length) andConds.push({ lugar_relacionado: { $in: lugarIds } });
        filtro = andConds.length ? { $and: andConds } : {};
        console.log('🔧 [ADVANCED FILTER]', JSON.stringify(filtro, null, 2));

        // 6) Consultar eventos y popular relaciones
        const resultados = await Evento.find(filtro)
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');

        console.log('✅ [RESULTS] preguntas:', resultados.length);
        return res.json({ capitulo: 'todos', resultados });

    } catch (error) {
        console.error('❌ [ERROR] en /api/preguntas:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
