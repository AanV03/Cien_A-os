/**
 * Modelo Mongoose: Evento
 * 
 * Representa un evento importante en la narrativa, que puede estar asociado a
 * personajes, un lugar y una generación dentro de la historia.
 */

const mongoose = require('mongoose'); // Importa Mongoose, la herramienta ODM para MongoDB.
const { Schema } = mongoose;         // Extrae el constructor Schema de Mongoose.

/**
 * Define el esquema de un Evento.
 * 
 * @typedef {Object} Evento
 * @property {string} nombre - Nombre del evento. Es obligatorio.
 * @property {string} [descripcion] - Descripción opcional del evento.
 * @property {Array<ObjectId>} personajes_involucrados - Referencias a los personajes relacionados con el evento.
 * @property {ObjectId} lugar_relacionado - Referencia al lugar donde ocurre el evento.
 * @property {ObjectId} generacion_relacionada - Referencia a la generación histórica del evento.
 */

const EventoSchema = new Schema({
    nombre: {
        type: String,
        required: true // El nombre del evento es obligatorio
    },
    descripcion: String, // Descripción breve del evento (opcional)

    personajes_involucrados: [{
        type: Schema.Types.ObjectId, // Cada ID referencia un documento en la colección 'personajes'
        ref: 'Personaje'
    }],

    lugar_relacionado: {
        type: Schema.Types.ObjectId, // ID que referencia un lugar específico
        ref: 'Lugar'
    },

    generacion_relacionada: {
        type: Schema.Types.ObjectId, // ID que referencia una generación
        ref: 'Generacion'
    }
});

/**
 * Exporta el modelo 'Evento' basado en el esquema definido.
 * 
 * El tercer argumento ('eventos') especifica el nombre exacto de la colección en MongoDB,
 * evitando que Mongoose intente pluralizar el nombre automáticamente.
 */
module.exports = mongoose.model('Evento', EventoSchema, 'eventos');
