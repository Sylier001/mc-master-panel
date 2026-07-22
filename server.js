const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const botRegistry = {};

io.on('connection', (socket) => {
  socket.emit('init_bots', botRegistry);

  socket.on('register_bot', (data) => {
    botRegistry[data.username] = {
      username: data.username,
      online: data.online || false,
      status: data.status || 'Bağlanıyor...',
      health: data.health || 0,
      food: data.food || 0,
      logs: botRegistry[data.username]?.logs || []
    };
    io.emit('bot_updated', botRegistry[data.username]);
  });

  socket.on('bot_status_update', (data) => {
    if (botRegistry[data.username]) {
      botRegistry[data.username] = { ...botRegistry[data.username], ...data };
      io.emit('bot_updated', botRegistry[data.username]);
    }
  });

  // Chat Mesajını kaydet ve arayüze ilet
  socket.on('bot_chat_received', ({ username, message }) => {
    if (botRegistry[username]) {
      if (!botRegistry[username].logs) botRegistry[username].logs = [];
      botRegistry[username].logs.push(message);
      if (botRegistry[username].logs.length > 100) botRegistry[username].logs.shift(); // Son 100 mesajı tut

      io.emit('new_chat_message', { username, message });
    }
  });

  socket.on('send_command', ({ botId, command }) => {
    io.emit('execute_command', { botId, command });
  });

  socket.on('control_bot_request', ({ botId, action }) => {
    if (botRegistry[botId]) {
      botRegistry[botId].status = action === 'start' ? 'Başlatılıyor...' : 'Kapatıldı';
      botRegistry[botId].online = action === 'start';
      io.emit('bot_updated', botRegistry[botId]);
    }
    io.emit('control_bot', { botId, action });
  });
});

server.listen(PORT, () => {
  console.log(`[Master Panel] Server ${PORT} portunda aktif.`);
});
