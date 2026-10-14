# Tombola — Frontend Develop

Progetto Angular 20 con **servizi già pronti** per collegarsi al backend.  
Le pagine `/banco` e `/giocatore` sono vuote.

PRIMARY COLOR NESEA: #EC008C


## Avvio

```bash
cd FE
npm install
npm start
```

Richiede BE attivo su `http://localhost:3000`.

Configurazione in `src/environments/environment.ts`:
- `apiUrl` → REST
- `wsUrl` → WebSocket

---

## Servizi disponibili

### 1. `ApiService` — REST (HTTP)

Iniettalo con `inject(ApiService)`.

```typescript
import { ApiService } from './services/api.service';

// Verifica che il BE sia online
this.api.healthCheck().subscribe(res => console.log(res.status));

// Quante cartelle esistono (50)
this.api.getCartelleCount().subscribe(res => console.log(res.count));

// Tipi vincita: ambo, terna, quaterna, cinquina, tombola
this.api.getWinTypes().subscribe(res => console.log(res.winTypes));

// Snapshot stato stanza (senza realtime)
this.api.getRoom('1234').subscribe(res => console.log(res.room));
```

---

### 2. `SocketService` — WebSocket realtime

**Importante:** chiamare `connect()` una volta (es. nel componente root o all'ingresso pagina).

```typescript
import { SocketService } from './services/socket.service';

private socket = inject(SocketService);

ngOnInit() {
  this.socket.connect();

  // Ascolta eventi in arrivo dal server
  this.socket.onNumberExtracted().subscribe(e => {
    console.log('Estratto:', e.number, e.extractedNumbers);
  });
  this.socket.onGameStarted().subscribe(({ room }) => console.log('Partita iniziata', room));
  this.socket.onPlayerJoined().subscribe(({ player, room }) => console.log('Nuovo giocatore', player));
  this.socket.onWinClaimed().subscribe(({ claim, room }) => console.log('Vincita reclamata', claim));
  this.socket.onWinConfirmed().subscribe(({ claim }) => console.log('Vincita confermata', claim));
  this.socket.onWinRejected().subscribe(({ rejected }) => console.log('Vincita rifiutata', rejected));
  this.socket.onGameFinished().subscribe(({ room }) => console.log('Partita finita', room));
  this.socket.onBankDisconnected().subscribe(({ room }) => console.log('Banco disconnesso', room));
  this.socket.onConnectionChanged().subscribe(connected => console.log('Socket', connected ? 'online' : 'offline'));
}
```

#### Metodi Banco

```typescript
// 1. Crea stanza → ritorna room con id a 4 cifre
const res = await this.socket.createRoom();
if (res.success) console.log('Codice stanza:', res.room!.id);

// 2. Rientra dopo refresh
const res = await this.socket.rejoinBankRoom('1234');

// 3. Avvia partita (almeno 1 giocatore in stanza)
const res = await this.socket.startGame(roomId);

// 4. Estrai numero (debounce 2.5s tra estrazioni)
const res = await this.socket.extractNumber(roomId);
if (!res.success && res.error === 'DEBOUNCE') {
  console.log('Aspetta', res.waitMs, 'ms');
}

// 5. Conferma / rifiuta vincita reclamata da un giocatore
await this.socket.confirmWin(roomId);
await this.socket.rejectWin(roomId);
```

#### Metodi Giocatore

```typescript
// 1. Entra in stanza → riceve cartella random
const res = await this.socket.joinRoom('1234', 'Mario');
if (res.success) {
  console.log('Player ID:', res.playerId);
  console.log('Cartella:', res.cartella);  // grid 3x9 + numbers[]
  console.log('Stanza:', res.room);
}

// 2. Rientra dopo refresh (passa playerId salvato in localStorage)
const res = await this.socket.joinRoom('1234', 'Mario', savedPlayerId);

// 3. Reclama vincita → mette la partita in pausa
const res = await this.socket.claimWin(roomId, playerId, 'ambo');
// winType: 'ambo' | 'terna' | 'quaterna' | 'cinquina' | 'tombola'
```

#### Sync stato

```typescript
const res = await this.socket.getRoomState('1234');
if (res.success) console.log(res.room);
```

Tutti i metodi ritornano `Promise<SocketResponse>` con `{ success, error?, message?, room?, cartella?, ... }`.

---

### 3. `GameSessionService` — Stato sessione locale

Gestisce ruolo, stanza e persistenza in `localStorage`.

```typescript
import { GameSessionService } from './services/game-session.service';

private session = inject(GameSessionService);

// Dopo createRoom (banco)
this.session.setBankSession(room);

// Dopo joinRoom (giocatore)
this.session.setPlayerSession(room, cartella, playerId, playerName);

// Aggiorna quando arrivano eventi socket
this.session.updateRoom(room);

// Leggi stato (signals Angular)
this.session.role();           // 'bank' | 'player' | null
this.session.room();           // Room | null
this.session.cartella();       // Cartella | null (solo giocatore)
this.session.playerId();
this.session.extractedNumbers(); // numeri estratti
this.session.isNumberExtracted(42);

// Pulisci al logout
this.session.clearSession();

// Per rejoin dopo refresh
const stored = this.session.getStoredSession();
// { role, roomId, playerId, playerName }
```

---

## Modelli TypeScript

Definiti in `src/app/models/tombola.models.ts`:

| Tipo | Descrizione |
|------|-------------|
| `Room` | Stanza: id, status, extractedNumbers, players, claimedWins... |
| `Cartella` | `{ id, grid: (number\|null)[][], numbers: number[] }` |
| `WinType` | `'ambo' \| 'terna' \| 'quaterna' \| 'cinquina' \| 'tombola'` |
| `GameStatus` | `'waiting' \| 'playing' \| 'paused' \| 'finished'` |

---

## Flusso di gioco (riferimento)

```
Banco: createRoom() → comunica room.id (4 cifre)
Giocatore: joinRoom(id, nome) → riceve cartella random
Banco: startGame(id)
Banco: extractNumber(id) ogni ~2.5s
Giocatore: claimWin(id, playerId, tipo) → status = paused
Banco: confirmWin(id) o rejectWin(id) → riprende o finisce (tombola)
```

---

## Eventi socket (broadcast automatici)

| Evento | Chi lo riceve | Quando |
|--------|---------------|--------|
| `game:started` | tutti in stanza | banco avvia partita |
| `game:number-extracted` | tutti in stanza | banco estrae |
| `game:win-claimed` | tutti in stanza | giocatore reclama |
| `game:win-confirmed` | tutti in stanza | banco conferma |
| `game:win-rejected` | tutti in stanza | banco rifiuta |
| `game:finished` | tutti in stanza | tombola confermata |
| `room:player-joined` | tutti in stanza | nuovo giocatore |
| `room:player-left` | tutti in stanza | giocatore esce |
| `bank:disconnected` | tutti in stanza | banco si disconnette |

---

## Struttura cartelle

```
src/app/
├── models/tombola.models.ts
├── services/
│   ├── api.service.ts
│   ├── socket.service.ts
│   └── game-session.service.ts
└── pages/
    ├── home/        ← solo link navigazione
    ├── banco/       ← DA IMPLEMENTARE
    └── giocatore/   ← DA IMPLEMENTARE
```

Documentazione API completa del BE: `../BE/README.md`
