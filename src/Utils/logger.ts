import P from 'pino'

export interface ILogger {
	level: string
	child(obj: Record<string, unknown>): ILogger
	trace(obj: unknown, msg?: string): void
	debug(obj: unknown, msg?: string): void
	info(obj: unknown, msg?: string): void
	warn(obj: unknown, msg?: string): void
	error(obj: unknown, msg?: string): void
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL CONSOLE LOG — @fathirsthore
// ─────────────────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'

// Warna
const CYAN   = '\x1b[36m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED    = '\x1b[31m'
const GRAY   = '\x1b[90m'
const BLUE   = '\x1b[34m'
const MAGENTA= '\x1b[35m'
const WHITE  = '\x1b[37m'

// ── Banner ASCII saat start ─────────────────────────────────────────────────
const BANNER = `
${CYAN}${BOLD}█▀ ▄▀▄ ▀█▀ █░█ █ █▀▀▄
█▀ █▀█ ░█░ █▀█ █ █▐█▀
▀░ ▀░▀ ░▀░ ▀░▀ ▀ ▀░▀▀${RESET}

${WHITE}${BOLD}baileys online by : ${CYAN}@fathirsthore${RESET}
${GRAY}c 2026${RESET}
`

let _bannerPrinted = false
function printBannerOnce() {
	if (_bannerPrinted) return
	_bannerPrinted = true
	console.log(BANNER)
}

// ── Level config ────────────────────────────────────────────────────────────
const LEVEL_PRIORITY: Record<string, number> = {
	trace: 10, debug: 20, info: 30, warn: 40, error: 50
}

const LEVEL_COLOR: Record<string, string> = {
	trace: GRAY,
	debug: CYAN,
	info:  GREEN,
	warn:  YELLOW,
	error: RED
}

const LEVEL_ICON: Record<string, string> = {
	trace: '░',
	debug: '◈',
	info:  '●',
	warn:  '▲',
	error: '✖'
}

// ── Format waktu ────────────────────────────────────────────────────────────
function ftime(): string {
	const n = new Date()
	const p = (x: number) => String(x).padStart(2, '0')
	return `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`
}

// ── Format pesan ────────────────────────────────────────────────────────────
function fmsg(obj: unknown, msg?: string): string {
	if (typeof obj === 'string') return obj
	if (msg) {
		const extras = obj && typeof obj === 'object' && Object.keys(obj as object).length > 0
			? ' ' + JSON.stringify(obj)
			: ''
		return msg + extras
	}
	if (obj && typeof obj === 'object') return JSON.stringify(obj)
	return String(obj)
}

// ── Garis separator ─────────────────────────────────────────────────────────
function separator() {
	return `${GRAY}${'─'.repeat(50)}${RESET}`
}

// ── Factory logger ──────────────────────────────────────────────────────────
function createPanelLogger(levelStr: string = 'info', context: Record<string, unknown> = {}): ILogger {
	printBannerOnce()

	const ctxStr = Object.keys(context).length > 0
		? `${BLUE}[${Object.entries(context).map(([k, v]) => `${k}:${v}`).join(' ')}]${RESET} `
		: ''

	const log = (level: string, obj: unknown, msg?: string) => {
		if ((LEVEL_PRIORITY[level] ?? 30) < (LEVEL_PRIORITY[levelStr] ?? 30)) return

		const color = LEVEL_COLOR[level] || WHITE
		const icon  = LEVEL_ICON[level]  || '·'
		const time  = `${GRAY}${ftime()}${RESET}`
		const lvl   = `${color}${BOLD}${icon} ${level.toUpperCase().padEnd(5)}${RESET}`
		const text  = `${color}${fmsg(obj, msg)}${RESET}`

		console.log(`${time} ${lvl} ${ctxStr}${text}`)
	}

	return {
		level: levelStr,
		child: (bindings: Record<string, unknown>) =>
			createPanelLogger(levelStr, { ...context, ...bindings }),
		trace: (o, m) => log('trace', o, m),
		debug: (o, m) => log('debug', o, m),
		info:  (o, m) => log('info',  o, m),
		warn:  (o, m) => log('warn',  o, m),
		error: (o, m) => log('error', o, m),
	}
}

export { createPanelLogger, separator, BANNER }
export default createPanelLogger('info') as unknown as ReturnType<typeof P>
