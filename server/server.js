const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { registerSocketHandlers } = require('./socket');
const { generateRoomId } = require('./utils');
const { hashPassword } = require('./auth');
const roomStore = require('./rooms');

const app = express();
const PORT = process.env.PORT || 3000;
const ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';

// Middlewares de Segurança
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", 'wss:', 'ws:', 'https:']
      }
    }
  })
);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições criadas a partir deste IP. Tente novamente mais tarde.' }
});
app.use('/api/', limiter);

// Endpoints REST
app.post('/api/rooms/create', async (req, res) => {
  try {
    const { password } = req.body;
    const roomId = generateRoomId(8);
    const passwordHash = password ? await hashPassword(password) : null;
    res.status(201).json({ success: true, roomId, passwordProtected: !!passwordHash, passwordHash });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erro ao criar sala' });
  }
});

app.get('/api/rooms/check/:roomId', (req, res) => {
  const room = roomStore.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ exists: false });
  }
  return res.json({
    exists: true,
    isLocked: room.isLocked,
    requiresPassword: !!room.passwordHash,
    participantCount: room.participants.size,
    maxParticipants: room.maxParticipants
  });
});

app.get('/room/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/room.html'));
});

// Inicialização do Servidor (HTTP ou HTTPS)
let server;
if (ENABLE_HTTPS && process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  try {
    const sslOptions = {
      key: fs.readFileSync(path.resolve(process.env.SSL_KEY_PATH)),
      cert: fs.readFileSync(path.resolve(process.env.SSL_CERT_PATH))
    };
    server = https.createServer(sslOptions, app);
  } catch (err) {
    console.warn('Falha ao carregar certificados SSL. Inicializando em HTTP...');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Shared Screen rodando na porta ${PORT}`);
  console.log(` Protocolo: ${ENABLE_HTTPS ? 'HTTPS' : 'HTTP'}`);
  console.log(` URL: http${ENABLE_HTTPS ? 's' : ''}://localhost:${PORT}`);
  console.log(`=========================================`);
});
