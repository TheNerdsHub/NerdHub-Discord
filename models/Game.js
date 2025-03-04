const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('Game', gameSchema);