const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Statik HTML/CSS/JS dosyalarını dışarıya aç
app.use(express.static('public'));

// Bağlı bot durumlarını hafızada tut
const activeBots = new Map();

io.on('connection', (socket) => {
  console.log(`[Bağlantı] Yeni istemci/worker bağlandı: ${socket.id}`);

  // Bot ilk defa bağlandığında kaydet
  socket.on('register_bot', (data) => {
    activeBots.set(data.username, {
      socketId: socket.id,
      username: data.username,
      online: data.online,
      health: data.health || 20,
      food: data.food || 20
    });
    io.emit('bot_list_update', Array.from(activeBots.values()));
  });

  // Bot can/durum güncellediğinde
  socket.on('bot_status_update', (data) => {
    if (activeBots.has(data.username)) {
      const bot = activeBots.get(data.username);
      bot.online = data.online !== undefined ? data.online : bot.online;
      bot.health = data.health !== undefined ? data.health : bot.health;
      bot.food = data.food !== undefined ? data.food : bot.food;
      activeBots.set(data.username, bot);
      io.emit('bot_list_update', Array.from(activeBots.values()));
    }
  });

  // Web panelinden gelen komutları ilgili Worker'a yönlendir
  socket.on('send_command', ({ botId, command }) => {
    io.emit('execute_command', { botId, command });
  });

  socket.on('disconnect', () => {
    // Kopan socket'e ait botları offline çek
    for (let [username, bot] of activeBots.entries()) {
      if (bot.socketId === socket.id) {
        bot.online = false;
        activeBots.set(username, bot);
      }
    }
    io.emit('bot_list_update', Array.from(activeBots.values()));
  });
});

server.listen(PORT, () => {
  console.log(`[Master Panel] ${PORT} portunda dinleniyor.`);
});