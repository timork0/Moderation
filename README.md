# 💻 Discord Moderation & Utility Bot

Un bot de Discord profesional que combina funcionalidades de moderación, sistema premium, giveaways, tickets, modmail, y más. Construido con Node.js y MongoDB, incluye un sistema de logs avanzado, consola coloreada y una arquitectura modular optimizada.

## 🚀 Características

- ⚒️ **Moderación completa**: comandos como `ban`, `warn`, `mod-user`, entre otros.
- 🎁 **Sistema de premios y economía**: incluye `giveaway`, `steal`, `premium`, `redeem` y `premiumcode`.
- 🎫 **Sistema de Tickets**: gestión de soporte mediante comandos personalizados.
- 💌 **Modmail**: canal privado de comunicación entre miembros y staff.
- 📦 **Sistema Premium**: funcionalidad exclusiva mediante códigos canjeables.
- 📋 **Sistema de Logs Profesional**: seguimiento detallado de acciones administrativas.
- 🌈 **Consola con colores**: para mejor legibilidad de mensajes y errores.
- 🧠 **MongoDB integrado**: para almacenar usuarios, tickets, datos premium, y más.
- 🔩 **Arquitectura modular**: comandos, eventos, schemas y utilidades organizadas para escalar fácilmente.

---

## ⚙️ Configuración

1. Clona el repositorio:

```bash
git clone https://github.com/TU_USUARIO/NOMBRE_REPOSITORIO
cd NOMBRE_REPOSITORIO
npm install
```

2. Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

TOKEN=tu_token_de_discord
MONGO_DB=tu_uri_de_mongodb

3. Ejecuta el bot:

```bash
npm start
```

## 🗂️ Estructura del Proyecto

`src/
├── commands/       → Comandos disponibles para el bot
│   ├── ban.js
│   ├── giveaway.js
│   ├── mod-user.js
│   ├── premium.js
│   ├── premiumcode.js
│   ├── redeem.js
│   ├── steal.js
│   ├── ticket.js
│   └── warn.js
├── events/         → Eventos de Discord.js
├── schemas/        → Modelos de MongoDB
├── utils/          → Funciones auxiliares
└── index.js        → Punto de entrada principal
.env                → Variables de entorno
package.json        → Dependencias y metadatos del proyecto`

## 📌 Requisitos

- Node.js `v18` o superior
- MongoDB (Atlas o local)

## 🧪 Funcionalidades en Desarrollo

- 🌐 Panel web con estadísticas y control
- 🔗 Comandos Slash (Discord Interactions)
- 💰 Sistema de economía y niveles

## 🤝 Contribuciones

¿Tienes ideas, mejoras o encontraste un bug? ¡Los Pull Requests y Issues son bienvenidos!