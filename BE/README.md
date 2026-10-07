# Tombola — Backend

API REST + WebSocket (Socket.io) per il gioco della tombola.

## Avvio

```bash
cd BE
npm install
npm run dev
```

Server su `http://localhost:3000`

## Variabili ambiente

| Variabile     | Default                  | Descrizione        |
|---------------|--------------------------|--------------------|
| `PORT`        | `3000`                   | Porta HTTP/WS      |
| `CORS_ORIGIN` | `http://localhost:4200`  | Origin Angular FE  |

## API REST

| Metodo | Endpoint              | Descrizione                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/health`         | Health check                   |
| GET    | `/api/cartelle/count` | Numero cartelle disponibili    |
| GET    | `/api/cartelle`       | Lista ID cartelle              |
| GET    | `/api/win-types`      | Tipi vincita supportati        |
| GET    | `/api/rooms/:roomId`  | Stato stanza (snapshot)        |

## Eventi WebSocket

### Banco → Server

| Evento                  | Payload                          | Risposta ack        |
|-------------------------|----------------------------------|---------------------|
| `bank:create-room`      | —                                | `{ room }`          |
| `bank:rejoin-room`      | `{ roomId }`                     | `{ room }`          |
| `bank:start-game`       | `{ roomId }`                     | `{ room }`          |
| `bank:extract-number`   | `{ roomId }`                     | `{ number, ... }`   |
| `bank:confirm-win`      | `{ roomId }`                     | `{ claim, room }`   |
| `bank:reject-win`       | `{ roomId }`                     | `{ room }`          |

### Giocatore → Server

| Evento               | Payload                                      | Risposta ack              |
|----------------------|----------------------------------------------|---------------------------|
| `player:join-room`   | `{ roomId, playerName, playerId? }`          | `{ room, cartella, playerId }` |
| `player:claim-win`   | `{ roomId, playerId, winType }`              | `{ claim, room }`         |

### Server → Client (broadcast stanza)

| Evento                   | Payload                                      |
|--------------------------|----------------------------------------------|
| `game:started`           | `{ room }`                                   |
| `game:number-extracted`  | `{ number, extractedNumbers, totalExtracted }` |
| `game:win-claimed`       | `{ claim, room }`                            |
| `game:win-confirmed`     | `{ claim, room }`                            |
| `game:win-rejected`      | `{ rejected, room }`                         |
| `game:finished`          | `{ room }`                                   |
| `room:player-joined`     | `{ player, room }`                           |
| `room:player-left`       | `{ playerId, room }`                         |
| `bank:disconnected`      | `{ room }`                                   |

## Regole di gioco

- **50 cartelle** statiche in `src/data/cartelle.json` (generabili con `npm run generate-cartelle`)
- **Codice stanza**: 4 cifre univoche
- **Debounce estrazioni**: 2.5 secondi
- **Vincite**: ambo (2), terna (3), quaterna (4), cinquina (5), tombola (15 numeri)
- Reclamo vincita → stato `paused` → banco conferma/rifiuta
- Tombola confermata → partita `finished`

## Struttura

```
BE/
├── src/
│   ├── data/cartelle.json      # 50 cartelle statiche
│   ├── routes/api.js           # REST endpoints
│   ├── services/
│   │   ├── cartellaService.js
│   │   ├── roomService.js
│   │   └── winValidator.js
│   ├── socket/handlers.js      # WebSocket handlers
│   └── index.js
└── scripts/generate-cartelle.js
```
