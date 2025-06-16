/**
 * @fileoverview Ruta /api/preguntas
 * 
 * Procesa preguntas semánticas usando NLP (procesamiento de lenguaje natural).
 * Identifica menciones a capítulos, personajes, lugares y verbos clave,
 * y busca eventos relacionados de forma inteligente.
 */

const express = require('express');
const router = express.Router();
const { analizarPregunta } = require('../nlpProcessor');
const Capitulo = require('../models/model_capitulos');
const Evento = require('../models/model_eventos');
const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Generacion = require('../models/model_generaciones');

/**
 * GET /api/preguntas
 * 
 * Procesa una consulta semántica compleja con soporte para NLP.
 * Identifica menciones a capítulos, eventos similares, personajes y lugares.
 * Realiza búsqueda de eventos según entidades mencionadas y verbos detectados.
 * 
 * @route GET /api/preguntas?q=consulta
 * @queryparam {string} q - Texto de la pregunta
 * @returns {Object} Resultados de eventos relacionados con la pregunta
 */
router.get('/', async (req, res) => {
    const q = req.query.q?.trim();
    console.log(`[ROUTE] GET /api/preguntas?q=${q}`);

    if (!q) {
        console.log('[ERROR] Falta parámetro "q"');
        return res.status(400).json({ error: 'Falta parámetro "q"' });
    }

    // Atajo directo: detectar si solo se pide "capítulo <número>"
    const matchCap = q.match(/cap[ií]tulo\s*(\d+)/i);
    if (matchCap) {
        const capNum = parseInt(matchCap[1]);
        const capDoc = await Capitulo.findOne({ numero: capNum }).populate({
            path: 'eventos',
            populate: ['personajes_involucrados', 'lugar_relacionado', 'generacion_relacionada']
        });

        if (!capDoc) {
            console.log(`[INFO] Capítulo ${capNum} no encontrado`);
            return res.json({ capitulo: capNum, resultados: [] });
        }

        console.log(`[INFO] Capítulo ${capNum} encontrado con ${capDoc.eventos.length} eventos`);
        return res.json({ capitulo: capNum, resultados: capDoc.eventos });
    }

    // Análisis semántico vía NLP personalizado
    const analisis = await analizarPregunta(q);
    const { capitulo, regexVerbos, personajes, lugares, fuzzy } = analisis;
    console.log('[ANALYSIS]', analisis);

    try {
        /**
         * 1. Si se detectó un número de capítulo explícito, retornar sus eventos directamente.
         */
        if (capitulo) {
            const capDoc = await Capitulo.findOne({ numero: capitulo });
            if (!capDoc) {
                console.log('[ERROR] Capítulo no existe');
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

            console.log('[RESULTS] eventos capítulo', capitulo, capDoc.eventos.length);
            return res.json({ capitulo, resultados: capDoc.eventos });
        }

        /**
         * 2. Si se encontró un evento similar mediante fuzzy search, devolverlo directamente.
         */
        if (fuzzy) {
            console.log('[FUZZY] Evento similar encontrado con fuzzy search');
            await fuzzy.populate([
                { path: 'personajes_involucrados' },
                { path: 'lugar_relacionado' },
                { path: 'generacion_relacionada' }
            ]);
            return res.json({ capitulo: 'similar', resultados: [fuzzy] });
        }

        /**
         * 3. Buscar IDs de personajes y lugares mencionados en la pregunta.
         */
        let personajeIds = [];
        if (personajes.length) {
            const docs = await Personaje.find(
                { nombre: { $in: personajes.map(p => new RegExp(p, 'i')) } },
                '_id'
            );
            personajeIds = docs.map(d => d._id);
        }

        let lugarIds = [];
        if (lugares.length) {
            const docs = await Lugar.find(
                { nombre: { $in: lugares.map(l => new RegExp(l, 'i')) } },
                '_id'
            );
            lugarIds = docs.map(d => d._id);
        }

        console.log('[IDs] personajes:', personajeIds, 'lugares:', lugarIds);

        /**
         * 4. Si no hay verbos ni entidades detectadas, no se puede filtrar.
         */
        if ((!regexVerbos || regexVerbos.length === 0) && personajes.length === 0 && lugares.length === 0) {
            console.log('[FILTER] No hay verbo ni entidad detectada -> 0 resultados');
            return res.json({ capitulo: 'todos', resultados: [] });
        }

        /**
         * 5. Construir filtro avanzado para eventos basado en entidades y verbos.
         */
        let filtro = {};
        const andConds = [];

        function escapeRegex(str) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        if (regexVerbos?.length) {
            andConds.push({
                $or: [
                    ...regexVerbos.map(r => ({ descripcion: r })),
                    ...regexVerbos.map(r => ({ nombre: r }))
                ]
            });
        }

        if (personajeIds.length) andConds.push({ personajes_involucrados: { $in: personajeIds } });
        if (lugarIds.length) andConds.push({ lugar_relacionado: { $in: lugarIds } });
        filtro = andConds.length ? { $and: andConds } : {};

        console.log('[ADVANCED FILTER]', JSON.stringify(filtro, null, 2));

        /**
         * 6. Consultar eventos filtrados y popular sus relaciones.
         */
        const resultados = await Evento.find(filtro)
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');

        console.log('[RESULTS] preguntas:', resultados.length);
        return res.json({ capitulo: 'todos', resultados });

    } catch (error) {
        console.error('[ERROR] en /api/preguntas:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
