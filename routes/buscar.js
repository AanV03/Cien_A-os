/**
 * @fileoverview Ruta /api/buscar
 * 
 * Permite realizar una búsqueda textual simple sobre todas las colecciones principales:
 * personajes, lugares, objetos, generaciones y eventos.
 * La comparación se realiza sobre los campos `nombre` y `descripcion` (cuando aplica),
 * utilizando texto normalizado sin tildes ni puntuación.
 */

const express = require('express');
const router = express.Router();

const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Objeto = require('../models/model_objetos');
const Evento = require('../models/model_eventos');
const Generacion = require('../models/model_generaciones');

/**
 * Normaliza un string eliminando tildes, mayúsculas y puntuación.
 *
 * @param {string} str - Texto de entrada.
 * @returns {string} Texto limpio para comparación.
 */
function normalizeStr(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')     // Elimina tildes
        .replace(/[^a-z0-9\s]/g, '');        // Elimina puntuación
}

/**
 * GET /api/buscar
 * 
 * Realiza una búsqueda flexible comparando el texto normalizado del parámetro `q`
 * contra los campos `nombre` y `descripcion` (cuando esté presente) de todas las colecciones.
 * 
 * Devuelve un objeto con resultados agrupados por tipo de entidad.
 * 
 * @route GET /api/buscar?q=texto
 * @queryparam {string} q - Texto a buscar (obligatorio)
 * @returns {Object} Resultados agrupados: { personajes, lugares, objetos, generaciones, eventos }
 */
router.get('/', async (req, res) => {
    const qRaw = req.query.q;
    console.log(`[ROUTE] GET /api/buscar?q=${qRaw}`);

    if (!qRaw) {
        return res.status(400).json({ error: 'Falta parámetro q' });
    }

    const qNorm = normalizeStr(qRaw);

    try {
        const [todosPers, todosLug, todosObj, todosGen, todosEvt] = await Promise.all([
            // Personajes con objetos embebidos
            Personaje.find().populate('objetos', 'nombre descripcion'),

            // Lugares sin campos adicionales
            Lugar.find(),

            // Objetos con todas sus relaciones populadas
            Objeto.find()
                .populate('evento_relacionado', 'nombre')
                .populate('lugar_relacionado', 'nombre')
                .populate('personaje_relacionado', 'nombre')
                .populate('generacion_relacionada', 'nombre'),

            // Generaciones completas
            Generacion.find(),

            // Eventos con personajes, lugar y generación
            Evento.find()
                .populate('personajes_involucrados', 'nombre')
                .populate('lugar_relacionado', 'nombre')
                .populate('generacion_relacionada', 'nombre')
        ]);

        // Aplicar filtro por coincidencia en `nombre` o `descripcion`
        const personajes = todosPers.filter(p => normalizeStr(p.nombre).includes(qNorm));
        const lugares = todosLug.filter(l => normalizeStr(l.nombre).includes(qNorm));
        const objetos = todosObj.filter(o => normalizeStr(o.nombre).includes(qNorm));
        const generaciones = todosGen.filter(g => normalizeStr(g.nombre).includes(qNorm));
        const eventos = todosEvt.filter(e =>
            normalizeStr(e.nombre).includes(qNorm) ||
            normalizeStr(e.descripcion || '').includes(qNorm)
        );

        console.log('[RESULTS]',
            `personajes=${personajes.length}`,
            `lugares=${lugares.length}`,
            `objetos=${objetos.length}`,
            `generaciones=${generaciones.length}`,
            `eventos=${eventos.length}`
        );

        return res.json({ personajes, lugares, objetos, generaciones, eventos });

    } catch (error) {
        console.error('[ERROR] en /api/buscar:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
