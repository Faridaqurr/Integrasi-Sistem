const mongoose = require('mongoose');

const concertSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true }
});

const Concert = mongoose.model('Concert', concertSchema);

module.exports = Concert;