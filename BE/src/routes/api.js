import { Router } from 'express';
import { getAllCartelle, getCartellaCount } from '../services/cartellaService.js';
import { getRoom } from '../services/roomService.js';
import { getWinTypes } from '../services/winValidator.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

router.get('/cartelle/count', (_req, res) => {
  res.json({ count: getCartellaCount() });
});

router.get('/cartelle', (_req, res) => {
  res.json({ cartelle: getAllCartelle().map(({ id }) => ({ id })) });
});

router.get('/win-types', (_req, res) => {
  res.json({ winTypes: getWinTypes() });
});

router.get('/rooms/:roomId', (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Stanza non trovata' });
  }
  res.json({ room });
});

export default router;
