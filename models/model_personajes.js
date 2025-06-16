/**
 * Modelo Mongoose: Personaje
 * 
 * Representa un personaje dentro de la historia, con atributos personales como nombre,
 * destino, género y generación. También puede estar asociado a varios objetos.
 */

const mongoose = require('mongoose'); // Importa Mongoose para trabajar con MongoDB.
const { Schema } = mongoose;         // Extrae el constructor Schema de Mongoose.

/**
 * Define el esquema de un Personaje.
 * 
 * @typedef {Object} Personaje
 * @property {string} nombre - Nombre del personaje. Campo obligatorio.
 * @property {string} [destino] - Descripción del destino o desenlace del personaje.
 * @property {'masculino' | 'femenino' | 'otro'} [genero] - Género del personaje. Valores permitidos: masculino, femenino, otro.
 * @property {number} [generacion] - Número de la generación a la que pertenece.
 * @property {Array<ObjectId>} objetos - Lista de objetos que pertenecen o están relacionados con este personaje.
 */

const PersonajeSchema = new Schema({
    nombre: {
        type: String,
        required: true // El nombre del personaje es obligatorio
    },
    destino: {
        type: String // Destino o desenlace del personaje (opcional)
    },
    genero: {
        type: String,
        enum: ['masculino', 'femenino', 'otro'] // Restringe los valores posibles para el género
    },
    generacion: {
        type: Number // Número que indica a qué generación pertenece (opcional)
    },
    objetos: [{
        type: Schema.Types.ObjectId, // Referencia a objetos vinculados con el personaje
        ref: 'Objeto'
    }]
});

/**
 * Exporta el modelo 'Personaje' basado en el esquema definido.
 * 
 * El tercer argumento ('personajes') define el nombre exacto de la colección en MongoDB.
 */
module.exports = mongoose.model('Personaje', PersonajeSchema, 'personajes');
