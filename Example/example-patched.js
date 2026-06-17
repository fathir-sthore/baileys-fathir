/**
 * ╔═══════════════════════════════════════════════════════╗
 * ║  BAILEYS PATCHED — Example Bot                       ║
 * ║  github: fathirsthore/fathir17-baileys               ║
 * ╚═══════════════════════════════════════════════════════╝
 *
 * Install:
 *   npm i github:fathirsthore/fathir17-baileys
 *
 * package.json:
 *   "@whiskeysockets/baileys": "github:fathirsthore/fathir17-baileys"
 */

const {
	default: makeWASocket,
	useMultiFileAuthState,
	DisconnectReason,
	Browsers,
	createPanelLogger,
} = require('@whiskeysockets/baileys')

// ── Konfigurasi ──────────────────────────────────────────────────────────────
const SESSION_PATH  = './auth_session'
const PHONE_NUMBER  = '628xxxxxxxxxx' // Ganti nomor HP (tanpa +, tanpa spasi)

// Daftar newsletter channel yang mau di-autojoin saat bot start
// Format: ID newsletter (bisa dengan atau tanpa @newsletter)
const AUTO_JOIN_CHANNELS = [
	'120363426695663985@newsletter',
	// '120363XXXXXXXXXXXXXXXXX@newsletter',
]

// ── Start bot ─────────────────────────────────────────────────────────────────
async function startBot() {
	const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)

	const sock = makeWASocket({
		auth:   state,
		browser: Browsers.ubuntu('Chrome'),
		printQRInTerminal: false,

		// ── Panel Console Log ───────────────────────────────────────────────
		// Level: 'info' → production   |   'debug' → verbose / troubleshoot
		logger: createPanelLogger('info'),
		// ────────────────────────────────────────────────────────────────────
	})

	// ── Connection update ────────────────────────────────────────────────────
	sock.ev.on('connection.update', async (update) => {
		const { connection, lastDisconnect } = update

		if (connection === 'open') {
			console.log('✅ Bot berhasil terhubung!\n')

			// Auto join newsletters
			if (AUTO_JOIN_CHANNELS.length > 0) {
				const results = await sock.newsletterJoinMultiple(AUTO_JOIN_CHANNELS)
				for (const r of results) {
					if (r.success) console.log(`📢 Joined channel: ${r.name} (${r.id})`)
					else           console.log(`❌ Gagal join: ${r.id} — ${r.error}`)
				}
			}
		}

		if (connection === 'close') {
			const code    = lastDisconnect?.error?.output?.statusCode
			const logout  = code === DisconnectReason.loggedOut
			console.log(`🔴 Koneksi terputus (${code}). ${logout ? 'Logout.' : 'Reconnecting...'}`)
			if (!logout) setTimeout(() => startBot(), 3000)
		}
	})

	// ── Pairing code — Node 23+ compatible ──────────────────────────────────
	if (!sock.authState.creds.registered) {
		// Otomatis (random):
		const code = await sock.requestPairingCode(PHONE_NUMBER)

		// Custom code (tepat 8 karakter A-Z 0-9, auto uppercase):
		// const code = await sock.requestPairingCode(PHONE_NUMBER, 'FATHIR12')

		console.log(`\n🔑 PAIRING CODE: ${code}`)
		console.log('Masukkan di WhatsApp → Perangkat Tertaut → Tautkan Perangkat\n')
	}

	sock.ev.on('creds.update', saveCreds)

	// ── Contoh: join 1 channel manual ───────────────────────────────────────
	// await sock.newsletterJoinById('120363426695663985@newsletter')

	// ── Contoh: command handler ──────────────────────────────────────────────
	sock.ev.on('messages.upsert', async ({ messages }) => {
		const msg  = messages[0]
		if (!msg.message || msg.key.fromMe) return

		const text = msg.message?.conversation
			|| msg.message?.extendedTextMessage?.text
			|| ''

		// !joinchannel 120363426695663985@newsletter
		if (text.startsWith('!joinchannel ')) {
			const id = text.split(' ')[1]?.trim()
			if (!id) return sock.sendMessage(msg.key.remoteJid!, { text: '❌ ID channel tidak ditemukan' })

			const meta = await sock.newsletterJoinById(id)
			if (meta) {
				await sock.sendMessage(msg.key.remoteJid!, {
					text: `✅ Berhasil join channel!\n📢 Nama: ${meta.name}\n👥 Subscribers: ${meta.subscribers}`
				})
			} else {
				await sock.sendMessage(msg.key.remoteJid!, { text: '❌ Gagal join. Pastikan ID benar.' })
			}
		}
	})
}

startBot().catch(console.error)
