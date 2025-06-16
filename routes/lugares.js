/**
 * @fileoverview Rutas de API para gestionar lugares.
 * Permite obtener todos, obtener por ID, crear y actualizar lugares en la base de datos.
 */

const express = require('express');
const router = express.Router();
const Lugar = require('../models/model_lugares');
const mongoose = require('mongoose');

/**
 * GET /api/lugares
 * 
 * Devuelve la lista de todos los lugares registrados.
 * Solo incluye campos básicos: _id, nombre y descripción.
 * 
 * @route GET /api/lugares
 * @returns {Array<Lugar>} Lista de lugares
 */
router.get('/', async (req, res) => {
    try {
        const lista = await Lugar.find().select('_id nombre descripcion');
        res.json(lista);
    } catch (err) {
        console.error('[ERROR] GET /api/lugares', err);
        res.status(500).json({ error: 'Error al obtener lugares.' });
    }
});

/**
 * GET /api/lugares/:id
 * 
 * Devuelve un lugar específico por su ID.
 * Verifica que el ID tenga formato válido.
 * 
 * @route GET /api/lugares/:id
 * @param {string} id - ID del lugar
 * @returns {Lugar} Lugar encontrado
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de lugar inválido' });
    }
    try {
        const l = await Lugar.findById(id);
        if (!l) return res.status(404).json({ error: 'Lugar no encontrado' });
        res.json(l);
    } catch (err) {
        console.error('[ERROR] GET /api/lugares/:id', err);
        res.status(500).json({ error: 'Error al obtener el lugar.' });
    }
});

/**
 * POST /api/lugares
 * 
 * Crea un nuevo lugar con nombre (obligatorio) y descripción opcional.
 * 
 * @route POST /api/lugares
 * @body {string} nombre - Nombre del lugar (obligatorio)
 * @body {string} [descripcion] - Descripción del lugar (opcional)
 * @returns {Lugar} Lugar creado
 */
router.post('/', async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta campo "nombre"' });
    try {
        const nuevo = new Lugar({ nombre, descripcion });
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (err) {
        console.error('[ERROR] POST /api/lugares', err);
        res.status(500).json({ error: 'Error al crear lugar.' });
    }
});

/**
 * PUT /api/lugares/:id
 * 
 * Actualiza los campos de un lugar existente por ID.
 * Solo se modifican los campos enviados en el cuerpo de la petición.
 * 
 * @route PUT /api/lugares/:id
 * @param {string} id - ID del lugar a actualizar
 * @body {string} [nombre] - Nuevo nombre
 * @body {string} [descripcion] - Nueva descripción
 * @returns {Lugar} Lugar actualizado
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    const updates = {};
    ['nombre', 'descripcion', 'lugar_relacionado', 'eventos_relacionados', 'generaciones_relacionadas'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    console.log('[DEBUG] Datos recibidos en PUT /lugares:', req.body);

    try {
        const actualizado = await Lugar.findByIdAndUpdate(id, updates, { new: true });
        if (!actualizado) return res.status(404).json({ error: 'Lugar no encontrado' });
        res.json(actualizado);
    } catch (err) {
        console.error('[ERROR] PUT /api/lugares/:id', err);
        res.status(500).json({ error: 'Error al actualizar lugar.' });
    }
});

module.exports = router;
