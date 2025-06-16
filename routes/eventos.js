/**
 * @fileoverview Rutas de API para manejar eventos.
 * Permite crear, obtener (todos o por ID), y actualizar eventos.
 * Los eventos están relacionados con personajes, lugares y generaciones.
 */

const express = require('express');
const router = express.Router();
const Evento = require('../models/model_eventos');
const Personaje = require('../models/model_personajes');
const Lugar = require('../models/model_lugares');
const Generacion = require('../models/model_generaciones');
const mongoose = require('mongoose');

/**
 * GET /api/eventos
 * 
 * Devuelve todos los eventos registrados en la base de datos.
 * Incluye datos populados de personajes, lugar y generación relacionados.
 * 
 * @route GET /api/eventos
 * @returns {Array<Evento>} Lista de eventos
 */
router.get('/', async (req, res) => {
    try {
        const eventos = await Evento.find()
            .populate('personajes_involucrados lugar_relacionado generacion_relacionada');
        res.json(eventos);
    } catch (err) {
        console.error('[ERROR] GET /api/eventos', err);
        res.status(500).json({ error: 'Error al obtener eventos.' });
    }
});

/**
 * GET /api/eventos/:id
 * 
 * Devuelve un evento específico por su ID.
 * Valida que el ID sea un ObjectId válido.
 * 
 * @route GET /api/eventos/:id
 * @param {string} id - ID del evento
 * @returns {Evento} Evento encontrado
 */
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

/**
 * POST /api/eventos
 * 
 * Crea un nuevo evento con relaciones a otras entidades si se proveen.
 * Realiza validaciones básicas de existencia de personajes, lugar y generación.
 * 
 * @route POST /api/eventos
 * @body {string} nombre - Nombre del evento (obligatorio)
 * @body {string} [descripcion] - Descripción del evento
 * @body {Array<string>} [personajes_involucrados] - IDs de personajes relacionados
 * @body {string} [lugar_relacionado] - ID de lugar relacionado
 * @body {string} [generacion_relacionada] - ID de generación relacionada
 * @returns {Evento} Evento creado con datos populados
 */
router.post('/', async (req, res) => {
    const { nombre, descripcion, personajes_involucrados, lugar_relacionado, generacion_relacionada } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Falta campo "nombre"' });

    try {
        // Validar existencia de referencias si se proporcionan
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

/**
 * PUT /api/eventos/:id
 * 
 * Actualiza campos de un evento existente.
 * Valida ID y aplica los cambios solo en campos enviados.
 * 
 * @route PUT /api/eventos/:id
 * @param {string} id - ID del evento a actualizar
 * @body {string} [nombre] - Nuevo nombre del evento
 * @body {string} [descripcion] - Nueva descripción
 * @body {Array<string>} [personajes_involucrados] - Nuevos personajes relacionados
 * @body {string} [lugar_relacionado] - Nuevo lugar relacionado
 * @body {string} [generacion_relacionada] - Nueva generación relacionada
 * @returns {Evento} Evento actualizado con datos populados
 */
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    const { nombre, descripcion, personajes_involucrados, lugar_relacionado, generacion_relacionada } = req.body;

    try {
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
