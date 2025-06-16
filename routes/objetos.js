/**
 * @fileoverview Rutas de API para gestionar objetos narrativos.
 * Permite obtener, crear y actualizar objetos relacionados con eventos, personajes, lugares y generaciones.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Objeto = require('../models/model_objetos');

/**
 * GET /api/objetos
 *
 * Devuelve todos los objetos registrados.
 * Incluye referencias populadas si existen.
 *
 * @route GET /api/objetos
 * @returns {Array<Objeto>} Lista de objetos con sus relaciones.
 */
router.get('/', async (req, res) => {
    try {
        const objetos = await Objeto.find()
            .populate('evento_relacionado lugar_relacionado personaje_relacionado generacion_relacionada');
        res.json(objetos);
    } catch (err) {
        console.error('[ERROR] GET /api/objetos', err);
        res.status(500).json({ error: 'Error al obtener objetos.' });
    }
});

/**
 * GET /api/objetos/:id
 *
 * Devuelve un objeto específico por su ID.
 *
 * @route GET /api/objetos/:id
 * @param {string} id - ID del objeto
 * @returns {Objeto} Objeto encontrado con referencias populadas
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    try {
        const obj = await Objeto.findById(id)
            .populate('evento_relacionado lugar_relacionado personaje_relacionado generacion_relacionada');
        if (!obj) return res.status(404).json({ error: 'Objeto no encontrado' });
        res.json(obj);
    } catch (err) {
        console.error('[ERROR] GET /api/objetos/:id', err);
        res.status(500).json({ error: 'Error al obtener el objeto.' });
    }
});

/**
 * POST /api/objetos
 *
 * Crea un nuevo objeto con referencias opcionales a evento, personaje, lugar o generación.
 *
 * @route POST /api/objetos
 * @body {string} nombre - Nombre del objeto (obligatorio)
 * @body {string} [descripcion] - Descripción opcional
 * @body {string} [evento_relacionado] - ID del evento relacionado
 * @body {string} [lugar_relacionado] - ID del lugar relacionado
 * @body {string} [personaje_relacionado] - ID del personaje relacionado
 * @body {string} [generacion_relacionada] - ID de la generación relacionada
 * @returns {Objeto} Objeto creado con referencias populadas
 */
router.post('/', async (req, res) => {
    const { nombre, descripcion, evento_relacionado, lugar_relacionado, personaje_relacionado, generacion_relacionada } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta campo "nombre"' });

    try {
        const nuevo = new Objeto({
            nombre,
            descripcion,
            evento_relacionado,
            lugar_relacionado,
            personaje_relacionado,
            generacion_relacionada
        });
        await nuevo.save();
        const pop = await nuevo.populate('evento_relacionado lugar_relacionado personaje_relacionado generacion_relacionada');
        res.status(201).json(pop);
    } catch (err) {
        console.error('[ERROR] POST /api/objetos', err);
        res.status(500).json({ error: 'Error al crear objeto.' });
    }
});

/**
 * PUT /api/objetos/:id
 *
 * Actualiza un objeto existente por ID. Solo modifica los campos enviados.
 *
 * @route PUT /api/objetos/:id
 * @param {string} id - ID del objeto a actualizar
 * @body {string} [nombre] - Nombre nuevo
 * @body {string} [descripcion] - Descripción nueva
 * @body {string} [evento_relacionado] - ID de evento relacionado
 * @body {string} [lugar_relacionado] - ID de lugar relacionado
 * @body {string} [personaje_relacionado] - ID de personaje relacionado
 * @body {string} [generacion_relacionada] - ID de generación relacionada
 * @returns {Objeto} Objeto actualizado con referencias populadas
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    const updates = {};
    ['nombre', 'descripcion', 'evento_relacionado', 'lugar_relacionado', 'personaje_relacionado', 'generacion_relacionada'].forEach(campo => {
        if (req.body[campo] !== undefined) updates[campo] = req.body[campo];
    });

    try {
        const actualizado = await Objeto.findByIdAndUpdate(id, updates, { new: true })
            .populate('evento_relacionado lugar_relacionado personaje_relacionado generacion_relacionada');

        if (!actualizado) return res.status(404).json({ error: 'Objeto no encontrado' });
        res.json(actualizado);
    } catch (err) {
        console.error('[ERROR] PUT /api/objetos/:id', err);
        res.status(500).json({ error: 'Error al actualizar objeto.' });
    }
});

module.exports = router;
