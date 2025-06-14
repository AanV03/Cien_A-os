const mongoose = require('mongoose');
const { Schema } = mongoose;

const GeneracionSchema = new Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String },
    personajes_principales: [{ type: Schema.Types.ObjectId, ref: 'Personaje' }]
});

module.exports = mongoose.model('Generacion', GeneracionSchema, 'generaciones');
