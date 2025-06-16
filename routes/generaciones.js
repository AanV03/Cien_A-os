/**
 * @fileoverview Rutas de API para gestionar generaciones.
 * Permite obtener, crear y actualizar generaciones de personajes.
 */

const express = require('express');
const router = express.Router();
const Generacion = require('../models/model_generaciones');
const mongoose = require('mongoose');

/**
 * GET /api/generaciones
 * 
 * Devuelve todas las generaciones con sus campos básicos.
 * 
 * @route GET /api/generaciones
 * @returns {Array<Generacion>} Lista de generaciones
 */
router.get('/', async (req, res) => {
    try {
        const lista = await Generacion.find().select('_id nombre descripcion');
        res.json(lista);
    } catch (err) {
        console.error('[ERROR] GET /api/generaciones', err);
        res.status(500).json({ error: 'Error al obtener generaciones.' });
    }
});

/**
 * GET /api/generaciones/:id
 * 
 * Devuelve una generación específica por su ID.
 * 
 * @route GET /api/generaciones/:id
 * @param {string} id - ID de la generación
 * @returns {Generacion} Generación encontrada
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    try {
        const g = await Generacion.findById(id);
        if (!g) return res.status(404).json({ error: 'Generación no encontrada' });
        res.json(g);
    } catch (err) {
        console.error('[ERROR] GET /api/generaciones/:id', err);
        res.status(500).json({ error: 'Error al obtener la generación.' });
    }
});

/**
 * POST /api/generaciones
 * 
 * Crea una nueva generación.
 * 
 * @route POST /api/generaciones
 * @body {string} nombre - Nombre de la generación (obligatorio)
 * @body {string} [descripcion] - Descripción opcional
 * @returns {Generacion} Generación creada
 */
router.post('/', async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta campo "nombre"' });
    try {
        const nuevo = new Generacion({ nombre, descripcion });
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (err) {
        console.error('[ERROR] POST /api/generaciones', err);
        res.status(500).json({ error: 'Error al crear generación.' });
    }
});

/**
 * PUT /api/generaciones/:id
 * 
 * Actualiza los campos de una generación existente.
 * Solo se actualizan los campos enviados en el cuerpo de la petición.
 * 
 * @route PUT /api/generaciones/:id
 * @param {string} id - ID de la generación a actualizar
 * @body {string} [nombre] - Nuevo nombre
 * @body {string} [descripcion] - Nueva descripción
 * @returns {Generacion} Generación actualizada
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    const updates = {};
    ['nombre', 'descripcion', 'personajes_principales'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    try {
        const actualizado = await Generacion.findByIdAndUpdate(id, updates, { new: true });
        if (!actualizado) return res.status(404).json({ error: 'Generación no encontrada' });
        res.json(actualizado);
    } catch (err) {
        console.error('[ERROR] PUT /api/generaciones/:id', err);
        res.status(500).json({ error: 'Error al actualizar generación.' });
    }
});

module.exports = router;
