/**
 * @fileoverview Ruta /api/preguntas
 * 
 * Procesa preguntas semánticas usando NLP (procesamiento de lenguaje natural).
 * Identifica menciones a capítulos, personajes, lugares, verbos clave,
 * patrones de existencia, fuzzy search, y busca eventos relacionados.
 */

const express = require('express');
const router = express.Router();
const { analizarPregunta } = require('../nlpProcessor');
const Capitulo = require('../models/model_capitulos');
const Evento = require('../models/model_eventos');
const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Objeto = require('../models/model_objetos');
const Generacion = require('../models/model_generaciones');

/**
 * Escapa texto para uso literal en RegExp.
 * @param {string} text - Texto de entrada.
 * @returns {string} Texto escapado para usar en RegExp literal.
 */
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/preguntas
 * 
 * Procesa la consulta semántica enviada vía query parameter `q`.
 * Realiza atajos directos de búsqueda de capítulo, invoca el análisis semántico,
 * maneja patrones de existencia, fuzzy search y construye filtros avanzados
 * para buscar eventos relacionados. Aplica fallbacks cuando no hay resultados
 * iniciales.
 * 
 * @route GET /api/preguntas?q={string}
 * @queryparam {string} q - Texto de la pregunta en lenguaje natural (obligatorio)
 * @returns {Promise<import('express').Response>} Respuesta JSON con estructura:
 *   - { capitulo: number|string, resultados: Array<Evento> }
 *   - En caso de existencia: { capitulo: 'existencia', termino: string, resultados: Array<Evento> }
 *   - En caso de fuzzy: { capitulo: 'similar', resultados: [eventoSimilar] }
 *   - En caso de no encontrar nada: { capitulo: 'todos', resultados: [] }
 *   - En caso de error o capítulo no existente: status 400 o 404 con { error: string }
 */
router.get('/', async (req, res) => {
    const q = req.query.q?.trim();
    console.log(`[ROUTE] GET /api/preguntas?q=${q}`);
    if (!q) {
        console.log('[ERROR] Falta parámetro "q"');
        return res.status(400).json({ error: 'Falta parámetro "q"' });
    }

    // Atajo directo: “capítulo N”
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

    // Análisis semántico
    const analisis = await analizarPregunta(q);
    const { capitulo, terminoExistencia, regexVerbos, personajes, lugares, objetos, fuzzy } = analisis;
    console.log('[ANALYSIS]', analisis);

    try {
        // Si capítulo explícito (de nuevo, por si analizarPregunta devolviera)
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

        // Si fuzzy y no es pregunta de existencia
        if (fuzzy && !terminoExistencia) {
            console.log('[FUZZY] Evento similar encontrado con fuzzy search');
            await fuzzy.populate([
                { path: 'personajes_involucrados' },
                { path: 'lugar_relacionado' },
                { path: 'generacion_relacionada' }
            ]);
            return res.json({ capitulo: 'similar', resultados: [fuzzy] });
        }

        // Preparar arrays de IDs desde nombres detectados
        let personajeIds = [];
        if (personajes.length) {
            // personajes es array de strings con nombre original
            const docsP = await Personaje.find(
                { nombre: { $in: personajes.map(p => new RegExp(`^${escapeRegex(p)}$`, 'i')) } },
                '_id'
            );
            personajeIds = docsP.map(d => d._id);
        }
        let lugarIds = [];
        if (lugares.length) {
            const docsL = await Lugar.find(
                { nombre: { $in: lugares.map(l => new RegExp(`^${escapeRegex(l)}$`, 'i')) } },
                '_id'
            );
            lugarIds = docsL.map(d => d._id);
        }
        // Objetos detectados: buscamos su evento_relacionado
        let eventosDesdeObjetos = [];
        if (objetos.length) {
            const docsO = await Objeto.find(
                { nombre: { $in: objetos.map(o => new RegExp(`^${escapeRegex(o)}$`, 'i')) } },
                'evento_relacionado'
            );
            eventosDesdeObjetos = docsO
                .map(o => o.evento_relacionado)
                .filter(eid => !!eid);
        }
        console.log('[IDs] personajes:', personajeIds, 'lugares:', lugarIds, 'objetos→eventos:', eventosDesdeObjetos);

        // Si es pregunta de existencia
        if (terminoExistencia) {
            /**
             * Normaliza texto eliminando tildes y puntuación para comparar.
             * @param {string} str - Texto a normalizar.
             * @returns {string} Texto limpio.
             */
            const normalizarTexto = str =>
                str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '');

            const termino = normalizarTexto(terminoExistencia);

            const todosEventos = await Evento.find({}, 'nombre descripcion');
            const eventosCoincidentes = todosEventos.filter(e => {
                const nombreNorm = normalizarTexto(e.nombre || '');
                const descNorm = normalizarTexto(e.descripcion || '');
                return nombreNorm.includes(termino) || descNorm.includes(termino);
            });

            console.log('[EXISTENCE QUERY] término:', termino);
            console.log('[EXISTENCE QUERY] encontrados:', eventosCoincidentes.length);

            const eventosFinales = await Evento.find({ _id: { $in: eventosCoincidentes.map(e => e._id) } })
                .populate('personajes_involucrados lugar_relacionado generacion_relacionada');

            return res.json({ capitulo: 'existencia', termino: terminoExistencia, resultados: eventosFinales });
        }

        // Si no hay verbo clave, ni entidades, y tampoco fuzzy/existencia: 0 resultados
        if ((!regexVerbos || regexVerbos.length === 0)
            && personajeIds.length === 0
            && lugarIds.length === 0
            && eventosDesdeObjetos.length === 0
        ) {
            console.log('[FILTER] No hay verbo ni entidad detectada -> 0 resultados');
            return res.json({ capitulo: 'todos', resultados: [] });
        }

        // Construir filtro avanzado
        const andConds = [];
        if (regexVerbos && regexVerbos.length) {
            const orConds = [];
            for (const r of regexVerbos) {
                orConds.push(
                    { descripcion: { $regex: r.source, $options: 'i' } },
                    { nombre: { $regex: r.source, $options: 'i' } }
                );
            }
            andConds.push({ $or: orConds });
        }
        if (personajeIds.length) {
            andConds.push({ personajes_involucrados: { $in: personajeIds } });
        }
        if (lugarIds.length) {
            andConds.push({ lugar_relacionado: { $in: lugarIds } });
        }
        if (eventosDesdeObjetos.length) {
            andConds.push({ _id: { $in: eventosDesdeObjetos } });
        }

        const filtro = andConds.length ? { $and: andConds } : {};
        console.log('[ADVANCED FILTER]', JSON.stringify(filtro, null, 2));

        // Consulta inicial
        let resultados = await Evento.find(filtro)
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        console.log('[RESULTS initial] preguntas:', resultados.length);

        // Fallbacks en orden de prioridad
        if (resultados.length === 0 && eventosDesdeObjetos.length) {
            console.log('[FALLBACK] devolviendo eventos referenciados por objetos detectados');
            resultados = await Evento.find({ _id: { $in: eventosDesdeObjetos } })
                .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        }
        else if (resultados.length === 0 && personajeIds.length) {
            console.log('[FALLBACK] devolviendo eventos para personajes detectados');
            resultados = await Evento.find({ personajes_involucrados: { $in: personajeIds } })
                .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        }
        else if (resultados.length === 0 && lugarIds.length) {
            console.log('[FALLBACK] devolviendo eventos para lugares detectados');
            resultados = await Evento.find({ lugar_relacionado: { $in: lugarIds } })
                .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        }

        console.log('[RESULTS final] preguntas:', resultados.length);
        return res.json({ capitulo: 'todos', resultados });

    } catch (error) {
        console.error('[ERROR] en /api/preguntas:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
