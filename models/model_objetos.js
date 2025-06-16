/**
 * Modelo Mongoose: Objeto
 * 
 * Representa un objeto significativo dentro de la narrativa.
 * Un objeto puede estar relacionado con un evento, un lugar, un personaje y una generación específica.
 */

const mongoose = require('mongoose'); // Importa Mongoose para trabajar con MongoDB.
const { Schema } = mongoose;         // Extrae el constructor Schema de Mongoose.

/**
 * Define el esquema de un Objeto.
 * 
 * @typedef {Object} Objeto
 * @property {string} nombre - Nombre del objeto. Campo obligatorio.
 * @property {string} [descripcion] - Descripción opcional del objeto.
 * @property {ObjectId} [evento_relacionado] - Evento en el que el objeto aparece o tiene relevancia.
 * @property {ObjectId} [lugar_relacionado] - Lugar con el que el objeto está vinculado.
 * @property {ObjectId} [personaje_relacionado] - Personaje que posee o está conectado con el objeto.
 * @property {ObjectId} [generacion_relacionada] - Generación con la que el objeto está históricamente relacionado.
 */

const ObjetoSchema = new Schema({
    nombre: { 
        type: String, 
        required: true // El nombre del objeto es obligatorio
    },
    descripcion: { 
        type: String // Descripción del objeto (opcional)
    },
    evento_relacionado: {
        type: Schema.Types.ObjectId, // Referencia a un evento relevante
        ref: 'Evento'
    },
    lugar_relacionado: {
        type: Schema.Types.ObjectId, // Referencia a un lugar vinculado al objeto
        ref: 'Lugar'
    },
    personaje_relacionado: {
        type: Schema.Types.ObjectId, // Referencia a un personaje conectado con el objeto
        ref: 'Personaje'
    },
    generacion_relacionada: {
        type: Schema.Types.ObjectId, // Referencia a una generación histórica asociada
        ref: 'Generacion'
    }
});

/**
 * Exporta el modelo 'Objeto' basado en el esquema definido.
 * 
 * El tercer parámetro ('objetos') define el nombre exacto de la colección en MongoDB.
 */
module.exports = mongoose.model('Objeto', ObjetoSchema, 'objetos');
