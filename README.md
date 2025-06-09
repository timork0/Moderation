# 💻 Discord Moderation & Utility Bot

Un bot de Discord profesional que combina funcionalidades de moderación, sistema premium, giveaways, tickets, modmail, y más. Construido con Node.js y MongoDB, incluye un sistema de logs avanzado, consola coloreada y una arquitectura modular optimizada.

## 🚀 Características

- ⚒️ **Moderación completa**: comandos como `ban`, `warn`, `mod-user`, entre otros.
- 🎁 **Sistema de premios y economía**: incluye `giveaway`, `steal`, `premium`, `redeem` y `premiumcode`.
- 🎫 **Sistema de Tickets**: gestión de soporte mediante comandos personalizados.
- 🚨 **Sistema Anti-Raid**: detección y bloqueo automático de ataques en masa.
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
git clone https://github.com/timork0/Moderation
cd Moderation
npm install
```

2. Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

TOKEN=tu_token_de_discord
MONGO_DB=tu_uri_de_mongodb
CLIENT_ID=el_id_del_bot
GUILD_ID=el_id_de_tu_servidor
ownerId=tu_id_de_usuario

3. Ejecuta el bot:

```bash
npm start
```

## 📌 Requisitos

- Node.js `v18` o superior
- MongoDB (Atlas o local)

## 🧪 Funcionalidades en Desarrollo

- 🌐 Panel web con estadísticas y control
- 🔗 Comandos Slash (Discord Interactions)
- 💰 Sistema de economía y niveles

## 🤝 Contribuciones

¿Tienes ideas, mejoras o encontraste un bug? ¡Los Pull Requests y Issues son bienvenidos!