const mongoose = require('mongoose');
const { Schema } = mongoose;

const ObjetoSchema = new Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    evento_relacionado: { type: Schema.Types.ObjectId, ref: 'Evento' },
    lugar_relacionado: { type: Schema.Types.ObjectId, ref: 'Lugar' },
    personaje_relacionado: { type: Schema.Types.ObjectId, ref: 'Personaje' },
    generacion_relacionada: { type: Schema.Types.ObjectId, ref: 'Generacion' }
});

module.exports = mongoose.model('Objeto', ObjetoSchema, 'objetos');
