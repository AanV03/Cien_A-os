const mongoose = require('mongoose');
const { Schema } = mongoose;

const LugarSchema = new Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    generaciones_relacionadas: [{ type: Schema.Types.ObjectId, ref: 'Generacion' }],
    eventos_relacionados: [{ type: Schema.Types.ObjectId, ref: 'Evento' }],
    lugar_relacionado: { type: String } // si quieres que esto sea sublugar, se puede volver a referenciar
});

module.exports = mongoose.model('Lugar', LugarSchema, 'lugares');
