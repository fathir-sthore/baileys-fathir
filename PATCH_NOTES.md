# 🔧 FATHIR17-BAILEYS — PATCH NOTES
> Patch by @fathirsthore
> github: fathirsthore/fathir17-baileys

---

## Install

```json
// package.json
{
  "@whiskeysockets/baileys": "github:fathirsthore/fathir17-baileys"
}
```
```bash
npm install
```

---

## ✅ Fitur Patch

### 1. Node.js 23+ Support
- `engine-requirements.js` — Tidak crash di Node 23+
- `src/Socket/socket.ts` — Fix `requestPairingCode`:
  - Buffer handling kompatibel Node 20/21/22/23
  - Custom pairing code: auto uppercase, strip karakter aneh
  - Log info saat request pairing

### 2. Custom Newsletter (Join by ID)
`src/Socket/newsletter.ts`

```js
const { default: makeWASocket, createPanelLogger } = require('@whiskeysockets/baileys')

// Join 1 channel via ID
await sock.newsletterJoinById('120363426695663985@newsletter')

// ID tanpa @newsletter juga OK:
await sock.newsletterJoinById('120363426695663985')

// Join banyak channel sekaligus
const results = await sock.newsletterJoinMultiple([
  '120363426695663985@newsletter',
  '120363XXXXXXXXXXXXXXXXX@newsletter',
])
// results: [{ id, success, name?, error? }]
```

### 3. Panel Console Log
`src/Utils/logger.ts`

Tampilan saat start:
```
█▀ ▄▀▄ ▀█▀ █░█ █ █▀▀▄
█▀ █▀█ ░█░ █▀█ █ █▐█▀
▀░ ▀░▀ ░▀░ ▀░▀ ▀ ▀░▀▀

baileys online by : @fathirsthore
c 2026
```

Log per level:
```
12:34:56 ● INFO  pairing code ready
12:34:57 ▲ WARN  connection closed
12:34:58 ✖ ERROR failed to connect
```

Cara pakai di bot:
```js
const { createPanelLogger } = require('@whiskeysockets/baileys')

makeWASocket({
  logger: createPanelLogger('info'),   // production
  // logger: createPanelLogger('debug'), // verbose
})
```

---

## 📂 File Dimodifikasi

| File | Keterangan |
|------|-----------|
| `engine-requirements.js` | Node 23+ support |
| `src/Socket/socket.ts` | Fix pairing code Node 23+ |
| `src/Socket/newsletter.ts` | `newsletterJoinById` + `newsletterJoinMultiple` |
| `src/Utils/logger.ts` | Panel console log + ASCII banner |
| `src/Utils/index.ts` | Export `createPanelLogger` |
| `Example/example-patched.js` | Contoh bot lengkap |

---

## Build

```bash
npm install
npm run build
```
