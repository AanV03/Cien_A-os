// models/model_eventos.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventoSchema = new Schema({
    nombre: { type: String, required: true },
    descripcion: String,
    personajes_involucrados: [{ type: Schema.Types.ObjectId, ref: 'Personaje' }],
    lugar_relacionado: { type: Schema.Types.ObjectId, ref: 'Lugar' },
    generacion_relacionada: { type: Schema.Types.ObjectId, ref: 'Generacion' }
});

module.exports = mongoose.model('Evento', EventoSchema, 'eventos');
