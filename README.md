# Tombola — Challenge Aziendale

Gioco della tombola multiplayer: banco (web) + giocatori (mobile landscape).

## Struttura

```
n-ombola-2026/
├── BE/           # Node.js + Express + Socket.io
├── FE/           # Angular 20
└── FE-TASKS.md   # Task per il team frontend
```

## Quick start

**Terminale 1 — Backend:**
```bash
cd BE
npm install
npm run dev
```

**Terminale 2 — Frontend:**
```bash
cd FE
npm install
npm start
```

Apri `http://localhost:4200`

## Flusso di gioco

1. **Banco** crea partita → ottiene codice a 4 cifre
2. **Giocatori** entrano con il codice → ricevono cartella random (max 50)
3. **Banco** avvia partita
4. **Banco** estrae numeri (debounce 2.5s)
5. **Giocatore** chiama vincita (Ambo → Tombola)
6. **Banco** conferma o rifiuta → partita riprende o termina (Tombola)

## Documentazione

- [BE/README.md](BE/README.md) — API REST + WebSocket
- [FE/README.md](FE/README.md) — Struttura Angular
- [FE-TASKS.md](FE-TASKS.md) — Task integrazione frontend
