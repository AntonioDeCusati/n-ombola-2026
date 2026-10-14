
## Home

### H1 — Home scelta ruolo

**Descrizione**

Implementare la pagina `/` seguendo il mockup `screen-home.png`: due percorsi chiari **Banco** e **Giocatore**, logo Nesea, tono da challenge aziendale.

**Funzionalità**

- Navigazione verso `/banco` e `/giocatore` (routerLink o equivalente).
- Opzionale: indicatore server tramite `ApiService.healthCheck()` → `GET /api/health` (`{ status, timestamp }`).
- Chiamare `SocketService.connect()` una volta all’ingresso app (es. `AppComponent` o home) per tutta la sessione.

**Criteri di accettazione**

- Layout fedele a `screen-home.png`.
- Logo da asset (`logo_209x50.png` o `Nesea_Logo_white.png` in base allo sfondo).

---

## Task Banco (view desktop/web)

### B1 — UI/UX pannello banco (lobby e creazione partita)

**Descrizione**

Implementare la pagina `/banco` seguendo `screen-banco.png`, ottimizzata per **desktop full screen** (proiezione in sala): tipografia grande, contrasto alto, layout a colonne/pannelli chiari.

**Funzionalità**

- All’ingresso, se non esiste stanza attiva in sessione, mostrare CTA **“Crea partita”**.
- Al click: `await SocketService.createRoom()` (socket `bank:create-room`).
- In risposta (`success: true`): `GameSessionService.setBankSession(res.room)` e UI con:
  - **Codice stanza** a 4 cifre (`room.id`, es. `"8118"`) in evidenza centrale.
  - Pulsante **“Copia negli appunti”** (Clipboard API).
  - *(Opzionale)* QR verso `/giocatore?room={room.id}`.
- Stato iniziale: `room.status === 'waiting'`.

**API / servizi**

- `createRoom()` → `{ success, room?: Room, error?, message? }`
- Campi utili: `room.id`, `room.status`, `room.playerCount`, `room.debounceMs` (2500 ms)
- Rejoin (task B6): `rejoinBankRoom(roomId)`

**Criteri di accettazione**

- Layout fedele al mockup banco lobby.
- Codice stanza visibile dopo creazione.
- In questa task: solo lobby + creazione + display codice (no estrazione/vincite).

---

### B2 — Lista giocatori in tempo reale (banco)

**Descrizione**

Aggiungere al pannello banco un componente **lista giocatori** aggiornato in realtime in attesa e in partita.

**Funzionalità**

- Sottoscriversi a:
  - `socket.onPlayerJoined()` → broadcast `room:player-joined` `{ player, room }`
  - `socket.onPlayerLeft()` → `room:player-left` `{ playerId, room }`
- UI da `room.players` (`Player`: `id`, `name`, `cartellaId`, `joinedAt`).
- Per riga: **nome** + **ID cartella** (`cartellaId`, 1–50).
- Badge **“N giocatori”** con `room.playerCount`.
- Layout allineato a `screen-banco.png`.

**API / servizi**

- Stato iniziale da `room` di `createRoom()` / `rejoinBankRoom()`
- Opzionale: `await socket.getRoomState(roomId)` (`room:get-state`)

**Criteri di accettazione**

- Entrata/uscita giocatore senza refresh.
- Contatore coerente con `room.players` / `playerCount`.

---

### B3 — Estrazione numeri e tabellone 1–90 (banco)

**Descrizione**

Fase **partita in corso** sul banco: estrazione, debounce, tabellone. Riferimento: `screen-banco.png` (stato “in corso”).

**Funzionalità**

- Pulsante **“Estrai numero”** se `room.status === 'playing'` e `room.pendingWinClaim === null`.
- Click → `await socket.extractNumber(roomId)` (`bank:extract-number`).
- **Debounce:** disabilitare pulsante per `room.debounceMs` (~2500 ms); se `error === 'DEBOUNCE'`, usare `res.waitMs` per countdown.
- Countdown visivo fino alla prossima estrazione.
- **Ultimo numero** in hero; sync da `onNumberExtracted()` → `game:number-extracted` `{ number, extractedNumbers, totalExtracted }`.
- **Tabellone 1–90:** numeri in `room.extractedNumbers` evidenziati (componente S1).
- Animazione estrazione (ruota/pallina/flip) opzionale.

**API / servizi**

- Success: `{ number, extractedNumbers, totalExtracted }`
- Errori: `DEBOUNCE` (+ `waitMs`), `PENDING_WIN`, `NOT_PLAYING`, `ALL_EXTRACTED`

**Criteri di accettazione**

- Nessuna estrazione più veloce del debounce.
- Tabellone allineato a `extractedNumbers`.
- Contatore estratti visibile (es. `length / 90`).

---

### B4 — Gestione vincite (conferma / rifiuto banco)

**Descrizione**

Quando un giocatore reclama, il banco verifica e conferma o rifiuta. Mockup: **`screen-verifica-vincita.png`**.

**Funzionalità**

- `socket.onWinClaimed()` → `game:win-claimed` `{ claim, room }`.
- Con `room.status === 'paused'` e `room.pendingWinClaim`, **overlay fullscreen** con:
  - `pendingWinClaim.playerName`
  - `pendingWinClaim.type` (label IT: Ambo, Terna, …)
  - `pendingWinClaim.row` (0–2 o null per tombola)
- **Conferma** → `await socket.confirmWin(roomId)` (`bank:confirm-win`)
- **Rifiuta** → `await socket.rejectWin(roomId)` (`bank:reject-win`)
- Dopo conferma: `onWinConfirmed()`; se `room.status === 'finished'` → `onGameFinished()`
- Dopo rifiuto: `onWinRejected()` → partita torna `playing`
- Storico da `room.claimedWins`

**API / servizi**

- `WinClaim`: `type`, `playerId`, `playerName`, `row`, `claimedAt`, `confirmedAt?`

**Criteri di accettazione**

- Overlay durante pending claim; UI come mockup verifica vincita.
- Storico aggiornato dopo ogni conferma.

---

### B5 — Stati partita e schermate banco

**Descrizione**

Quattro UI in base a `room.status` (`GameStatus`).

| Status | UI |
|--------|-----|
| `waiting` | “In attesa giocatori”, **Inizia partita** (disabilitato se `playerCount === 0`) |
| `playing` | Estrazione + tabellone (B3) |
| `paused` | Banner verifica + overlay B4 |
| `finished` | Riepilogo da `claimedWins` |

**Funzionalità**

- **Inizia partita:** `await socket.startGame(roomId)`; broadcast `game:started`.
- Transizioni senza reload.
- Riepilogo finale per tipo vincita.

**API / servizi**

- `startGame` → errori: `NO_PLAYERS`, `INVALID_STATE`, `ROOM_NOT_FOUND`
- `onGameStarted()`, `onGameFinished()`

**Criteri di accettazione**

- Pulsante estrai solo in `playing` (e senza pending claim).
- Schermata `finished` elenca `claimedWins`.

---

### B6 — Resilienza banco (rejoin, errori socket)

**Descrizione**

Robustezza a refresh, errori API e rete.

**Funzionalità**

- Al mount, se `GameSessionService.getStoredSession()` ha `role === 'bank'` e `roomId` → `rejoinBankRoom(roomId)` + `setBankSession(room)`.
- Toast per errori: `DEBOUNCE` (`waitMs`), `PENDING_WIN`, `ROOM_NOT_FOUND`, `INVALID_STATE`, …
- `onConnectionChanged()` → indicatore online/offline (S1).

**API / servizi**

- `rejoinBankRoom`, `getRoomState`, `GameSessionService` persist/clear

**Criteri di accettazione**

- Refresh banco → stessa stanza e stato corretto.
- Errori visibili all’utente, non solo in console.

---

## Task Giocatore (view mobile landscape)

### G1 — Join stanza (codice 4 cifre + nome)

**Descrizione**

Ingresso su `/giocatore` secondo **`screen-entra-partita.png`**.

**Funzionalità**

- Input codice **4 cifre** (tastierino o PIN); validazione `^\d{4}$`.
- Nome opzionale.
- Submit → `await socket.joinRoom(roomId, playerName, playerId?)` (`player:join-room`).
- Success → `setPlayerSession(room, cartella, playerId, playerName)`.
- Deep link: query `?room=1234` precompila codice.
- Errori user-friendly:
  - `ROOM_NOT_FOUND`
  - `GAME_FINISHED`
  - `NO_CARTELLE`

**API / servizi**

- Success: `{ playerId, room, cartella }` — `cartella.grid` 3×9, `cartella.numbers[]`
- Opzionale: `ApiService.getRoom(roomId)`

**Criteri di accettazione**

- UI come mockup entra-partita.
- Errori server inline o toast.

---

### G2 — Layout mobile landscape e cartella tombola

**Descrizione**

Vista gioco in **landscape** come **`screen-giocatore.png`**: cartella ~70% sinistra, azioni ~30% destra.

**Funzionalità**

- CSS/viewport landscape; messaggio in portrait se serve.
- Griglia 3×9 da `cartella.grid`; celle vuote (`null`); touch min ~44px.
- Evidenziare numeri in `room.extractedNumbers` (`onNumberExtracted()` + stato iniziale).
- Header: codice stanza, nome, stato.

**API / servizi**

- `GameSessionService.cartella()`, `room()`, `isNumberExtracted(n)`

**Criteri di accettazione**

- Layout fedele al mockup landscape.
- Estratti aggiornati in realtime.

---

### G3 — Schermata attesa inizio partita (giocatore)

**Descrizione**

Con `room.status === 'waiting'`: cartella + attesa avvio banco.

**Funzionalità**

- Messaggio/animazione **“In attesa che il banco avvii la partita…”**
- Pulsanti vincita disabilitati.
- `onGameStarted()` → `updateRoom(room)` → vista in corso (G2/G4).

**API / servizi**

- `room.status`, `onGameStarted()` — nessuna azione giocatore richiesta

**Criteri di accettazione**

- Transizione automatica waiting → playing su `game:started`.
- Nessun reclamo in waiting.

---

### G4 — Pulsanti vincita (Ambo … Tombola)

**Descrizione**

Colonna destra landscape, **`screen-giocatore.png`**.

**Funzionalità**

- 5 pulsanti → `claimWin(roomId, playerId, winType)` con `WinType` lowercase.
- Disabilitare se partita non `playing` o tipo già in `room.claimedWins`.
- Success → pausa globale; passare a G5.
- Errori: `INVALID_CLAIM`, `ALREADY_CLAIMED`, `INVALID_WIN_TYPE`.

**API / servizi**

- Opzionale: `ApiService.getWinTypes()`
- `session.canClaimWinType(winType)`

**Criteri di accettazione**

- 5 CTA con stati disabled chiari.
- Reclamo valido apre flusso G5.

---

### G5 — Animazione e feedback reclamo vincita (giocatore)

**Descrizione**

Dopo reclamo riuscito: celebrazione + attesa banco (overlay giocatore; banco usa `screen-verifica-vincita.png`).

**Funzionalità**

- Overlay: **“Hai chiamato [Tipo]!”** + **OK**.
- In pausa: **“In attesa conferma del banco…”**
- `onWinConfirmed()` / `onWinRejected()` / `onGameFinished()` per esito finale.
- Animazione leggera (confetti) opzionale.

**API / servizi**

- Eventi `game:win-confirmed`, `game:win-rejected`, `game:finished`
- `room.pendingWinClaim`

**Criteri di accettazione**

- Flusso claim → pausa → conferma/rifiuta chiaro per il giocatore.

---

### G6 — Resilienza giocatore (rejoin, sync, banco disconnesso)

**Descrizione**

Refresh, rientro in stanza, banco assente.

**Funzionalità**

- Rejoin: `joinRoom(roomId, playerName, playerId)` con dati da `getStoredSession()`.
- Sync: `getRoomState(roomId)` dopo join.
- `onBankDisconnected()` → avviso “Il banco si è disconnesso”.
- **Esci** → `clearSession()` + vista join.

**API / servizi**

- localStorage chiave `tombola_session`

**Criteri di accettazione**

- Refresh → stessa cartella e estratti corretti.
- Disconnessione banco visibile all’utente.

---

## Task condivisi

### S1 — Componenti riusabili

**Descrizione**

Componenti standalone riusati da banco e giocatore, stile mockup `assets/`.

**Componenti**

1. **`CartellaComponent`** — `@Input() grid`, `@Input() extractedNumbers`
2. **`TabelloneComponent`** — 1–90, `@Input() extractedNumbers`
3. **`WinTypeBadgeComponent`** — `@Input() winType` (label IT)
4. **`ConnectionStatusComponent`** — da `onConnectionChanged()` o `@Input() connected`

**Criteri di accettazione**

- Usati in banco (tabellone) e giocatore (cartella); niente duplicazione griglie nelle pagine.

---

### S2 — Audio feedback (opzionale)

**Descrizione**

Suoni per estrazione, vincita confermata, errore reclamo. File in `assets/`, toggle “Suoni” opzionale, rispettare policy autoplay browser.

**Criteri di accettazione**

- Un play per evento; nessun blocco UX al primo load.

---

### S3 — Testing (unit + E2E)

**Descrizione**

Unit su `ApiService`, `GameSessionService`, `SocketService` (mock). E2E checklist: createRoom → joinRoom → startGame → extractNumber → claimWin → confirmWin/rejectWin.

**Criteri di accettazione**

- Unit verdi; checklist E2E in PR.

---

### S4 — Deploy e configurazione produzione

**Descrizione**

- `environment.prod.ts`: `apiUrl`, `wsUrl` verso BE produzione.
- BE: `CORS_ORIGIN` con URL FE.
- Documentare proxy nginx se serve.
- PWA opzionale (icon da logo Nesea).

**Criteri di accettazione**

- `ng build` prod ok; smoke test mobile verso BE deployato.

---

## Riferimento API (integrazione)

### Metodi `SocketService`

```typescript
createRoom(): Promise<SocketResponse>
rejoinBankRoom(roomId: string): Promise<SocketResponse>
joinRoom(roomId, playerName, playerId?): Promise<SocketResponse>
startGame(roomId: string): Promise<SocketResponse>
extractNumber(roomId: string): Promise<SocketResponse>
claimWin(roomId, playerId, winType): Promise<SocketResponse>
confirmWin(roomId: string): Promise<SocketResponse>
rejectWin(roomId: string): Promise<SocketResponse>
getRoomState(roomId: string): Promise<SocketResponse>
```

### Observable eventi realtime

```typescript
onNumberExtracted(): Observable<NumberExtractedEvent>
onGameStarted(): Observable<{ room: Room }>
onGameFinished(): Observable<{ room: Room }>
onWinClaimed(): Observable<WinClaimedEvent>
onWinConfirmed(): Observable<{ claim, room }>
onWinRejected(): Observable<{ rejected, room }>
onPlayerJoined(): Observable<PlayerJoinedEvent>
onPlayerLeft(): Observable<{ playerId, room }>
onBankDisconnected(): Observable<{ room: Room }>
onConnectionChanged(): Observable<boolean>
```

### Metodi `ApiService`

```typescript
healthCheck(): Observable<{ status, timestamp }>
getCartelleCount(): Observable<{ count }>
getWinTypes(): Observable<{ winTypes }>
getRoom(roomId): Observable<{ room }>
```

---

## Priorità suggerita

1. **Sprint 1**: H1, G1, G2, G3, B1, B2, B3 (flow base giocabile)
2. **Sprint 2**: G4, G5, B4, B5 (vincite end-to-end)
3. **Sprint 3**: B6, G6, S1 (resilienza + componenti)
4. **Sprint 4**: S2, S3, S4 (polish + deploy)