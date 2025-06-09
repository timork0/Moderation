const { Events } = require('discord.js');
const mongoose = require('mongoose');
const { color, textEffects } = require('../utils/loggingEffects');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		

		const mongoDB = process.env.MONGO_DB;

		mongoose.connect(mongoDB).catch(err => console.error(`⛔ ${textEffects.bold}${textEffects.underline}${color.red}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}Connection error.`, err));

		mongoose.connection.on('connected', () => {
			console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.green}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}MongoDB is connected.`);
		});

		mongoose.connection.on('error', (err) => {
			console.error(`❌ ${textEffects.bold}${textEffects.underline}${color.red}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}Error connecting to MongoDB: ${err}`);
		});

		mongoose.connection.on('disconnected', () => {
			console.warn(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}It is disconnected.`);
		});

		console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.green}[STATUS]${textEffects.reset} ${textEffects.reset}${color.reset}Bot ready!`);
	},
};
