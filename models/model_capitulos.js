/**
 * Modelo de Mongoose para representar un capítulo del libro.
 * 
 * Cada capítulo tiene un número y una lista de eventos asociados.
 * Los eventos están referenciados por sus ObjectId y corresponden a documentos en la colección 'eventos'.
 */

const mongoose = require('mongoose'); // Importa Mongoose, la librería ODM para MongoDB.
const Schema = mongoose.Schema;       // Extrae el constructor Schema de Mongoose.

/**
 * Define el esquema para la colección 'capitulos'.
 * 
 * @typedef {Object} Capitulo
 * @property {number} numero - Número identificador del capítulo.
 * @property {Array<ObjectId>} eventos - Lista de IDs que referencian eventos relacionados con este capítulo.
 */

const capituloSchema = new Schema({
    numero: Number, // Número del capítulo (por ejemplo: 1, 2, 3...)
    
    eventos: [{
        type: Schema.Types.ObjectId, // Referencia a un documento de la colección 'eventos'
        ref: 'Evento'                // Nombre del modelo referenciado (debe coincidir con el modelo 'Evento')
    }]
});

/**
 * Exporta el modelo 'Capitulo' basado en el esquema definido.
 * 
 * El tercer parámetro ('capitulos') indica el nombre exacto de la colección en MongoDB.
 * Esto evita que Mongoose pluralice el nombre automáticamente.
 */
module.exports = mongoose.model('Capitulo', capituloSchema, 'capitulos');
