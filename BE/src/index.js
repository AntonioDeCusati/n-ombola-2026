import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRouter from './routes/api.js';
import { registerSocketHandlers } from './socket/handlers.js';

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use('/api', apiRouter);

registerSocketHandlers(io);

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} già in uso. Termina l'altro processo o usa: $env:PORT=3001`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, () => {
  console.log(`Tombola BE in ascolto su http://localhost:${PORT}`);
  console.log(`WebSocket attivo | CORS: ${CORS_ORIGIN}`);
});
