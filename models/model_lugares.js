/**
 * Modelo Mongoose: Lugar
 * 
 * Representa un lugar dentro del universo narrativo. 
 * Puede estar relacionado con eventos ocurridos en él y con generaciones que lo habitaron o influyeron.
 * También puede contener una referencia textual a otro lugar relacionado (por ejemplo, un sublugar).
 */

const mongoose = require('mongoose'); // Importa Mongoose para manejar modelos de MongoDB.
const { Schema } = mongoose;         // Extrae el constructor Schema de Mongoose.

/**
 * Define el esquema de un Lugar.
 * 
 * @typedef {Object} Lugar
 * @property {string} nombre - Nombre del lugar. Campo obligatorio.
 * @property {string} [descripcion] - Descripción del lugar.
 * @property {Array<ObjectId>} generaciones_relacionadas - Referencias a generaciones asociadas con este lugar.
 * @property {Array<ObjectId>} eventos_relacionados - Referencias a eventos ocurridos en este lugar.
 * @property {string} [lugar_relacionado] - Nombre de otro lugar al que este pueda estar relacionado (ej. sublugar).
 */

const LugarSchema = new Schema({
    nombre: { 
        type: String, 
        required: true // El nombre del lugar es obligatorio
    },
    descripcion: { 
        type: String // Descripción del lugar (opcional)
    },
    generaciones_relacionadas: [{
        type: Schema.Types.ObjectId, // Referencias a generaciones vinculadas con este lugar
        ref: 'Generacion'
    }],
    eventos_relacionados: [{
        type: Schema.Types.ObjectId, // Referencias a eventos que ocurrieron en este lugar
        ref: 'Evento'
    }],
    lugar_relacionado: { 
        type: String // Puede ser usado para describir sublugares u otras relaciones textuales
    }
});

/**
 * Exporta el modelo 'Lugar' basado en el esquema definido.
 * 
 * El tercer argumento ('lugares') indica el nombre exacto de la colección en MongoDB.
 */
module.exports = mongoose.model('Lugar', LugarSchema, 'lugares');
