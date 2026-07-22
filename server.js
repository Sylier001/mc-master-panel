const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

// Statik dosyaları (index.html) sun
app.use(express.static(path.join(__dirname, 'public')));

// Bağlı tüm botların durumunu hafızada tut
const botRegistry = {};

io.on('connection', (socket) => {
  console.log(`[Socket] Yeni bir bağlantı sağlandı: ${socket.id}`);

  // Mevcut bot durumlarını yeni bağlanan web arayüzüne gönder
  socket.emit('init_bots', botRegistry);

  // Worker bot kaydı veya durum güncellemesi
  socket.on('register_bot', (data) => {
    botRegistry[data.username] = {
      username: data.username,
      online: data.online || false,
      status: data.status || 'Bağlanıyor...',
      health: data.health || 0,
      food: data.food || 0,
      socketId: socket.id
    };
    io.emit('bot_updated', botRegistry[data.username]);
  });

  socket.on('bot_status_update', (data) => {
    if (botRegistry[data.username]) {
      botRegistry[data.username] = {
        ...botRegistry[data.username],
        ...data
      };
      io.emit('bot_updated', botRegistry[data.username]);
    }
  });

  // Web Arayüzünden gelen Komut Gönderme
  socket.on('send_command', ({ botId, command }) => {
    io.emit('execute_command', { botId, command });
  });

  // Web Arayüzünden gelen Aç / Kapat (Start / Stop) İsteği
  socket.on('control_bot_request', ({ botId, action }) => {
    if (botRegistry[botId]) {
      botRegistry[botId].status = action === 'start' ? 'Başlatılıyor...' : 'Kapatıldı';
      botRegistry[botId].online = action === 'start';
      io.emit('bot_updated', botRegistry[botId]);
    }
    io.emit('control_bot', { botId, action });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Bağlantı koptu: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`[Master Panel] Server ${PORT} portunda aktif.`);
});
