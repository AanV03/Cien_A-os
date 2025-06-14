const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const capituloSchema = new Schema({
    numero: Number,
    eventos: [{
        type: Schema.Types.ObjectId,
        ref: 'Evento'
    }]
});

module.exports = mongoose.model('Capitulo', capituloSchema, 'capitulos');
