const mongoose = require('mongoose');
const { Schema } = mongoose;

const PersonajeSchema = new Schema({
    nombre: { type: String, required: true },
    destino: { type: String },
    genero: { type: String, enum: ['masculino', 'femenino', 'otro'] },
    generacion: { type: Number },
    objetos: [{ type: Schema.Types.ObjectId, ref: 'Objeto' }]
});

module.exports = mongoose.model('Personaje', PersonajeSchema, 'personajes');
