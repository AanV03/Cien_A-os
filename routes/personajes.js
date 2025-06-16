/**
 * @fileoverview Rutas de API para gestionar personajes.
 * Permite listar, obtener por ID, crear y actualizar personajes dentro del sistema.
 */

const express = require('express');
const router = express.Router();
const Personaje = require('../models/model_personajes');
const mongoose = require('mongoose');

/**
 * GET /api/personajes
 * 
 * Devuelve la lista de todos los personajes registrados.
 * Solo incluye campos clave (_id, nombre, descripción).
 * 
 * @route GET /api/personajes
 * @returns {Array<Personaje>} Lista de personajes
 */
router.get('/', async (req, res) => {
    try {
        const lista = await Personaje.find().select('_id nombre descripcion');
        res.json(lista);
    } catch (err) {
        console.error('[ERROR] GET /api/personajes', err);
        res.status(500).json({ error: 'Error al obtener personajes.' });
    }
});

/**
 * GET /api/personajes/:id
 * 
 * Devuelve un personaje específico por su ID.
 * Valida que el ID tenga formato válido.
 * 
 * @route GET /api/personajes/:id
 * @param {string} id - ID del personaje
 * @returns {Personaje} Personaje encontrado
 */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de personaje inválido' });
    }
    try {
        const p = await Personaje.findById(id);
        if (!p) return res.status(404).json({ error: 'Personaje no encontrado' });
        res.json(p);
    } catch (err) {
        console.error('[ERROR] GET /api/personajes/:id', err);
        res.status(500).json({ error: 'Error al obtener el personaje.' });
    }
});

/**
 * POST /api/personajes
 * 
 * Crea un nuevo personaje. El campo 'nombre' es obligatorio.
 * Los campos opcionales incluyen descripción, género, destino y generación.
 * 
 * @route POST /api/personajes
 * @body {string} nombre - Nombre del personaje (obligatorio)
 * @body {string} [descripcion] - Descripción del personaje
 * @body {'masculino'|'femenino'|'otro'} [genero] - Género del personaje
 * @body {string} [destino] - Destino o desenlace del personaje
 * @body {number} [generacion] - Número de generación al que pertenece
 * @returns {Personaje} Personaje creado
 */
router.post('/', async (req, res) => {
    const { nombre, descripcion, genero, destino, generacion } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'Falta campo "nombre"' });
    }
    try {
        const nuevo = new Personaje({ nombre, descripcion, genero, destino, generacion });
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (err) {
        console.error('[ERROR] POST /api/personajes', err);
        res.status(500).json({ error: 'Error al crear el personaje.' });
    }
});

/**
 * PUT /api/personajes/:id
 * 
 * Actualiza los campos de un personaje existente por su ID.
 * Solo se actualizan los campos enviados en el body.
 * 
 * @route PUT /api/personajes/:id
 * @param {string} id - ID del personaje
 * @body {string} [nombre] - Nuevo nombre
 * @body {string} [descripcion] - Nueva descripción
 * @body {'masculino'|'femenino'|'otro'} [genero] - Nuevo género
 * @body {string} [destino] - Nuevo destino
 * @body {number} [generacion] - Nueva generación
 * @returns {Personaje} Personaje actualizado
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de personaje inválido' });
    }

    const updates = {};
    ['nombre', 'descripcion', 'genero', 'destino', 'generacion'].forEach(field => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });

    try {
        const actualizado = await Personaje.findByIdAndUpdate(id, updates, { new: true });
        if (!actualizado) return res.status(404).json({ error: 'Personaje no encontrado' });
        res.json(actualizado);
    } catch (err) {
        console.error('[ERROR] PUT /api/personajes/:id', err);
        res.status(500).json({ error: 'Error al actualizar el personaje.' });
    }
});

module.exports = router;
