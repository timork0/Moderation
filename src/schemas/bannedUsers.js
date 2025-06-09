/*AntiRaid*/
const mongoose = require('mongoose');

const bannedUserSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    guildId: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BannedUser', bannedUserSchema);