/**
 * Modelo Mongoose: Generacion
 * 
 * Representa una generación dentro de la historia, que puede estar compuesta por
 * múltiples personajes principales y tener una descripción general.
 */

const mongoose = require('mongoose'); // Importa Mongoose para interactuar con MongoDB.
const { Schema } = mongoose;         // Extrae el constructor Schema.

/**
 * Define el esquema de una Generación.
 * 
 * @typedef {Object} Generacion
 * @property {string} nombre - Nombre de la generación. Es obligatorio.
 * @property {string} [descripcion] - Descripción opcional de la generación.
 * @property {Array<ObjectId>} personajes_principales - Lista de personajes clave en esta generación.
 */

const GeneracionSchema = new Schema({
    nombre: {
        type: String,
        required: true // El nombre de la generación es obligatorio
    },
    descripcion: {
        type: String // Descripción general de la generación (opcional)
    },
    personajes_principales: [{
        type: Schema.Types.ObjectId, // Cada ID referencia un personaje principal
        ref: 'Personaje'
    }]
});

/**
 * Exporta el modelo 'Generacion' basado en el esquema definido.
 * 
 * El tercer argumento ('generaciones') establece explícitamente el nombre de la colección en MongoDB.
 */
module.exports = mongoose.model('Generacion', GeneracionSchema, 'generaciones');
