// routes/eventos.js
const express = require('express');
const router = express.Router();
const Evento = require('../models/model_eventos');
const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Generacion = require('../models/model_generaciones');
const mongoose = require('mongoose');

// GET todos o con filtros (opcional)
router.get('/', async (req, res) => {
    // Si necesitas búsqueda o paginación: puedes leer query params
    try {
        const eventos = await Evento.find()
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        res.json(eventos);
    } catch (err) {
        console.error('[ERROR] GET /api/eventos', err);
        res.status(500).json({ error: 'Error al obtener eventos.' });
    }
});

// GET uno para preselección en modal
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    try {
        const evento = await Evento.findById(id)
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json(evento);
    } catch (err) {
        console.error('[ERROR] GET /api/eventos/:id', err);
        res.status(500).json({ error: 'Error al obtener el evento.' });
    }
});

// POST crear nuevo evento
router.post('/', async (req, res) => {
    const { nombre, descripcion, personajes_involucrados, lugar_relacionado, generacion_relacionada } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta campo "nombre"' });
    // Validar IDs referenciados si lo deseas
    try {
        // Validaciones referenciales (opcional)
        if (personajes_involucrados) {
            const persDocs = await Personaje.find({ _id: { $in: personajes_involucrados } });
            if (persDocs.length !== personajes_involucrados.length) {
                return res.status(400).json({ error: 'Algún personaje no existe' });
            }
        }
        if (lugar_relacionado) {
            const lugDoc = await Lugar.findById(lugar_relacionado);
            if (!lugDoc) return res.status(400).json({ error: 'Lugar no existe' });
        }
        if (generacion_relacionada) {
            const genDoc = await Generacion.findById(generacion_relacionada);
            if (!genDoc) return res.status(400).json({ error: 'Generación no existe' });
        }
        const nuevo = new Evento({
            nombre,
            descripcion,
            personajes_involucrados,
            lugar_relacionado,
            generacion_relacionada
        });
        await nuevo.save();
        const pop = await nuevo.populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        res.status(201).json(pop);
    } catch (err) {
        console.error('[ERROR] POST /api/eventos', err);
        res.status(500).json({ error: 'Error al crear evento.' });
    }
});

// PUT actualizar evento
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }
    const { nombre, descripcion, personajes_involucrados, lugar_relacionado, generacion_relacionada } = req.body;
    try {
        // Validaciones referenciales similares a POST...
        const updates = {};
        if (nombre !== undefined) updates.nombre = nombre;
        if (descripcion !== undefined) updates.descripcion = descripcion;
        if (personajes_involucrados !== undefined) updates.personajes_involucrados = personajes_involucrados;
        if (lugar_relacionado !== undefined) updates.lugar_relacionado = lugar_relacionado;
        if (generacion_relacionada !== undefined) updates.generacion_relacionada = generacion_relacionada;

        const actualizado = await Evento.findByIdAndUpdate(id, updates, { new: true })
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        if (!actualizado) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json(actualizado);
    } catch (err) {
        console.error('[ERROR] PUT /api/eventos/:id', err);
        res.status(500).json({ error: 'Error al actualizar evento.' });
    }
});

module.exports = router;
