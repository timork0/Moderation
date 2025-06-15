const { Events } = require('discord.js');
const mongoose = require('mongoose');
const { color, textEffects } = require('../utils/loggingEffects');

module.exports = {
	name: Events.ClientReady, // Cambié 'name' por 'nombre'
	once: true, // Cambié 'once' por 'unaVez'
	execute(cliente) { // Cambié 'execute' por 'ejecutar'
		

		const mongoDB = process.env.MONGO_DB;

		mongoose.connect(mongoDB).catch(err => console.error(`⛔ ${textEffects.bold}${textEffects.underline}${color.red}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}Error de conexión.`, err));

		mongoose.connection.on('connected', () => {
			console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.green}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}MongoDB está conectado.`);
		});

		mongoose.connection.on('error', (err) => {
			console.error(`❌ ${textEffects.bold}${textEffects.underline}${color.red}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}Error al conectar a MongoDB: ${err}`);
		});

		mongoose.connection.on('disconnected', () => {
			console.warn(`⚠️ ${textEffects.bold}${textEffects.underline}${color.yellow}[MONGO DB]${textEffects.reset} ${textEffects.reset}${color.reset}Está desconectado.`);
		});

		console.log(`✅ ${textEffects.bold}${textEffects.underline}${color.green}[ESTADO]${textEffects.reset} ${textEffects.reset}${color.reset}¡Bot listo!`);
	},
};
