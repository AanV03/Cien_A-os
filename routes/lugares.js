// routes/lugares.js
const express = require('express');
const router = express.Router();
const Lugar = require('../models/model_lugares');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    try {
        const lista = await Lugar.find().select('_id nombre descripcion');
        res.json(lista);
    } catch (err) {
        console.error('[ERROR] GET /api/lugares', err);
        res.status(500).json({ error: 'Error al obtener lugares.' });
    }
});

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

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    const updates = {};
    ['nombre', 'descripcion'].forEach(f => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
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
