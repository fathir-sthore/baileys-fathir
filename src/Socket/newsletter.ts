import type { NewsletterCreateResponse, SocketConfig, WAMediaUpload } from '../Types'
import type { NewsletterMetadata, NewsletterUpdate } from '../Types'
import { QueryIds, XWAPaths } from '../Types'
import { generateProfilePicture } from '../Utils/messages-media'
import { getBinaryNodeChild } from '../WABinary'
import { makeGroupsSocket } from './groups'
import { executeWMexQuery as genericExecuteWMexQuery } from './mex'

const parseNewsletterCreateResponse = (response: NewsletterCreateResponse): NewsletterMetadata => {
	const { id, thread_metadata: thread, viewer_metadata: viewer } = response
	return {
		id: id,
		owner: undefined,
		name: thread.name.text,
		creation_time: parseInt(thread.creation_time, 10),
		description: thread.description.text,
		invite: thread.invite,
		subscribers: parseInt(thread.subscribers_count, 10),
		verification: thread.verification,
		picture: {
			id: thread.picture.id,
			directPath: thread.picture.direct_path
		},
		mute_state: viewer.mute
	}
}

const parseNewsletterMetadata = (result: unknown): NewsletterMetadata | null => {
	if (typeof result !== 'object' || result === null) return null
	if ('id' in result && typeof result.id === 'string') return result as NewsletterMetadata
	if (
		'result' in result &&
		typeof result.result === 'object' &&
		result.result !== null &&
		'id' in result.result
	) {
		return result.result as NewsletterMetadata
	}
	return null
}

/**
 * Normalisasi newsletter JID
 * Menerima:
 *   - JID penuh   : "120363426695663985@newsletter"
 *   - ID saja     : "120363426695663985"
 * Selalu return format penuh: "XXXXXXXXXX@newsletter"
 */
const normalizeNewsletterJid = (idOrJid: string): string => {
	const clean = idOrJid.trim()
	if (clean.endsWith('@newsletter')) return clean
	// Pastikan hanya angka/huruf sebelum @newsletter
	const stripped = clean.replace(/@.*$/, '').trim()
	return `${stripped}@newsletter`
}

export const makeNewsletterSocket = (config: SocketConfig) => {
	const sock = makeGroupsSocket(config)
	const { query, generateMessageTag } = sock
const logger = config.logger

	const executeWMexQuery = <T>(variables: Record<string, unknown>, queryId: string, dataPath: string): Promise<T> => {
		return genericExecuteWMexQuery<T>(variables, queryId, dataPath, query, generateMessageTag)
	}

	const newsletterUpdate = async (jid: string, updates: NewsletterUpdate) => {
		const variables = {
			newsletter_id: jid,
			updates: { ...updates, settings: null }
		}
		return executeWMexQuery(variables, QueryIds.UPDATE_METADATA, 'xwa2_newsletter_update')
	}

	return {
		...sock,

		newsletterCreate: async (name: string, description?: string): Promise<NewsletterMetadata> => {
			const variables = { input: { name, description: description ?? null } }
			const rawResponse = await executeWMexQuery<NewsletterCreateResponse>(
				variables,
				QueryIds.CREATE,
				XWAPaths.xwa2_newsletter_create
			)
			return parseNewsletterCreateResponse(rawResponse)
		},

		newsletterUpdate,

		newsletterSubscribers: async (jid: string) => {
			return executeWMexQuery<{ subscribers: number }>(
				{ newsletter_id: jid },
				QueryIds.SUBSCRIBERS,
				XWAPaths.xwa2_newsletter_subscribers
			)
		},

		newsletterMetadata: async (type: 'invite' | 'jid', key: string) => {
			const variables = {
				fetch_creation_time: true,
				fetch_full_image: true,
				fetch_viewer_metadata: true,
				input: { key, type: type.toUpperCase() }
			}
			const result = await executeWMexQuery<unknown>(variables, QueryIds.METADATA, XWAPaths.xwa2_newsletter_metadata)
			return parseNewsletterMetadata(result)
		},

		newsletterFollow: (jid: string) => {
			return executeWMexQuery({ newsletter_id: jid }, QueryIds.FOLLOW, XWAPaths.xwa2_newsletter_join_v2)
		},

		newsletterUnfollow: (jid: string) => {
			return executeWMexQuery({ newsletter_id: jid }, QueryIds.UNFOLLOW, XWAPaths.xwa2_newsletter_leave_v2)
		},

		newsletterMute: (jid: string) => {
			return executeWMexQuery({ newsletter_id: jid }, QueryIds.MUTE, XWAPaths.xwa2_newsletter_mute_v2)
		},

		newsletterUnmute: (jid: string) => {
			return executeWMexQuery({ newsletter_id: jid }, QueryIds.UNMUTE, XWAPaths.xwa2_newsletter_unmute_v2)
		},

		newsletterUpdateName: async (jid: string, name: string) => newsletterUpdate(jid, { name }),

		newsletterUpdateDescription: async (jid: string, description: string) =>
			newsletterUpdate(jid, { description }),

		newsletterUpdatePicture: async (jid: string, content: WAMediaUpload) => {
			const { img } = await generateProfilePicture(content)
			return newsletterUpdate(jid, { picture: img.toString('base64') })
		},

		newsletterRemovePicture: async (jid: string) => newsletterUpdate(jid, { picture: '' }),

		newsletterReactMessage: async (jid: string, serverId: string, reaction?: string) => {
			await query({
				tag: 'message',
				attrs: {
					to: jid,
					...(reaction ? {} : { edit: '7' }),
					type: 'reaction',
					server_id: serverId,
					id: generateMessageTag()
				},
				content: [{ tag: 'reaction', attrs: reaction ? { code: reaction } : {} }]
			})
		},

		newsletterFetchMessages: async (jid: string, count: number, since: number, after: number) => {
			const messageUpdateAttrs: { count: string; since?: string; after?: string } = {
				count: count.toString()
			}
			if (typeof since === 'number') messageUpdateAttrs.since = since.toString()
			if (after) messageUpdateAttrs.after = after.toString()

			return query({
				tag: 'iq',
				attrs: { id: generateMessageTag(), type: 'get', xmlns: 'newsletter', to: jid },
				content: [{ tag: 'message_updates', attrs: messageUpdateAttrs }]
			})
		},

		subscribeNewsletterUpdates: async (jid: string): Promise<{ duration: string } | null> => {
			const result = await query({
				tag: 'iq',
				attrs: { id: generateMessageTag(), type: 'set', xmlns: 'newsletter', to: jid },
				content: [{ tag: 'live_updates', attrs: {}, content: [] }]
			})
			const liveUpdatesNode = getBinaryNodeChild(result, 'live_updates')
			const duration = liveUpdatesNode?.attrs?.duration
			return duration ? { duration } : null
		},

		newsletterAdminCount: async (jid: string): Promise<number> => {
			const response = await executeWMexQuery<{ admin_count: number }>(
				{ newsletter_id: jid },
				QueryIds.ADMIN_COUNT,
				XWAPaths.xwa2_newsletter_admin_count
			)
			return response.admin_count
		},

		newsletterChangeOwner: async (jid: string, newOwnerJid: string) => {
			await executeWMexQuery(
				{ newsletter_id: jid, user_id: newOwnerJid },
				QueryIds.CHANGE_OWNER,
				XWAPaths.xwa2_newsletter_change_owner
			)
		},

		newsletterDemote: async (jid: string, userJid: string) => {
			await executeWMexQuery(
				{ newsletter_id: jid, user_id: userJid },
				QueryIds.DEMOTE,
				XWAPaths.xwa2_newsletter_demote
			)
		},

		newsletterDelete: async (jid: string) => {
			await executeWMexQuery({ newsletter_id: jid }, QueryIds.DELETE, XWAPaths.xwa2_newsletter_delete_v2)
		},

		// ─────────────────────────────────────────────────────────────────────────
		// CUSTOM NEWSLETTER: Join by Newsletter ID (bukan invite link)
		//
		// Cara pakai:
		//   await sock.newsletterJoinById('120363426695663985@newsletter')
		//   await sock.newsletterJoinById('120363426695663985')   // tanpa @newsletter juga OK
		// ─────────────────────────────────────────────────────────────────────────
		newsletterJoinById: async (idOrJid: string): Promise<NewsletterMetadata | null> => {
			const jid = normalizeNewsletterJid(idOrJid)
			logger.info({ jid }, '📢 Auto joining newsletter channel by ID...')

			// Ambil metadata dulu via JID
			const variables = {
				fetch_creation_time: true,
				fetch_full_image: true,
				fetch_viewer_metadata: true,
				input: {
					key: jid,
					type: 'JID'
				}
			}
			const result = await executeWMexQuery<unknown>(
				variables,
				QueryIds.METADATA,
				XWAPaths.xwa2_newsletter_metadata
			)
			const parsed = parseNewsletterMetadata(result)
			if (!parsed) {
				logger.warn({ jid }, '⚠️  Gagal parse metadata newsletter — pastikan ID benar')
				return null
			}

			logger.info({ name: parsed.name, jid }, '📢 Channel ditemukan, sedang join...')

			// Follow/join channel
			await executeWMexQuery(
				{ newsletter_id: parsed.id },
				QueryIds.FOLLOW,
				XWAPaths.xwa2_newsletter_join_v2
			)

			logger.info({ name: parsed.name }, '✅ Berhasil join newsletter channel!')
			return parsed
		},

		// Auto join banyak channel sekaligus dari daftar ID/JID
		// Contoh: await sock.newsletterJoinMultiple(['120363426695663985@newsletter', '...'])
		newsletterJoinMultiple: async (
			idOrJidList: string[]
		): Promise<Array<{ id: string; success: boolean; name?: string; error?: string }>> => {
			const results: Array<{ id: string; success: boolean; name?: string; error?: string }> = []

			for (const raw of idOrJidList) {
				const jid = normalizeNewsletterJid(raw)
				try {
					// Gunakan newsletterJoinById secara internal
					const meta = await (sock as any).newsletterJoinById(jid)
					results.push({ id: jid, success: true, name: meta?.name })
					// Delay antar join — hindari rate limit WA
					await new Promise(r => setTimeout(r, 1500))
				} catch (err: any) {
					logger.warn({ jid, err: err.message }, '❌ Gagal join newsletter')
					results.push({ id: jid, success: false, error: err.message })
				}
			}

			return results
		}
	}
}

export type NewsletterSocket = ReturnType<typeof makeNewsletterSocket>
