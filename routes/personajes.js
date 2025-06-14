// routes/personajes.js
const express = require('express');
const router = express.Router();
const Personaje = require('../models/model_personajes');
const mongoose = require('mongoose');

// GET /api/personajes         → listar todos
router.get('/', async (req, res) => {
    try {
        const lista = await Personaje.find().select('_id nombre descripcion');
        // Ajusta campos a tu esquema: aquí solo devolvemos _id y nombre, descripción opcional
        res.json(lista);
    } catch (err) {
        console.error('[ERROR] GET /api/personajes', err);
        res.status(500).json({ error: 'Error al obtener personajes.' });
    }
});

// GET /api/personajes/:id     → obtener uno por id
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

// POST /api/personajes        → crear uno nuevo
router.post('/', async (req, res) => {
    const { nombre, descripcion, genero, destino, generacion } = req.body;
    // Valida campos requeridos según tu modelo
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

// PUT /api/personajes/:id     → actualizar
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de personaje inválido' });
    }
    const updates = {};
    // Opcional: solo asigna campos si vienen en el body
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
