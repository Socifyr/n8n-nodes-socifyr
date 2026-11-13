import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const CREATE_OPS = ['createText', 'createPhotos', 'createVideo', 'createDocument'];
const MEDIA_OPS = ['createPhotos', 'createVideo', 'createDocument'];
const ID_OPS = [
	'getContent',
	'publishDraft',
	'publishNow',
	'submitForApproval',
	'approvePost',
	'rejectPost',
	'retryFailed',
	'deleteContent',
];

const PLATFORM_OPTIONS = [
	'instagram',
	'facebook',
	'x',
	'linkedin',
	'tiktok',
	'youtube',
	'threads',
	'pinterest',
	'reddit',
	'bluesky',
	'telegram',
	'discord',
	'mastodon',
	'nostr',
	'slack',
].map((value) => ({ name: value.charAt(0).toUpperCase() + value.slice(1), value }));

const CONTENT_FORMAT_OPTIONS = [
	'short_video',
	'story',
	'feed_video',
	'photo_single',
	'photo_carousel',
	'text_post',
	'document_post',
].map((value) => ({ name: value.replace(/_/g, ' '), value }));

const STATUS_OPTIONS = [
	{ name: '(any)', value: '' },
	...['draft', 'queued', 'pending', 'processing', 'publishing', 'completed', 'partial_failure', 'failed'].map(
		(value) => ({ name: value.replace(/_/g, ' '), value }),
	),
];

function show(operations: string[]): INodeProperties['displayOptions'] {
	return { show: { resource: ['content'], operation: operations } };
}

const properties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [{ name: 'Content', value: 'content' }],
		default: 'content',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['content'] } },
		options: [
			{ name: 'Create Text Post', value: 'createText', description: 'Publish or schedule a text post', action: 'Create a text post' },
			{ name: 'Create Photo Post', value: 'createPhotos', description: 'Publish photos from library IDs or public URLs', action: 'Create a photo post' },
			{ name: 'Create Video Post', value: 'createVideo', description: 'Publish a video (reel/short) from a library ID or public URL', action: 'Create a video post' },
			{ name: 'Create Document Post', value: 'createDocument', description: 'Publish a document (LinkedIn carousel/PDF)', action: 'Create a document post' },
			{ name: 'Bulk Schedule', value: 'bulkSchedule', description: 'Schedule many text posts from rows or CSV', action: 'Bulk schedule posts' },
			{ name: 'Get Content', value: 'getContent', description: 'Fetch one post with per-platform results', action: 'Get a post' },
			{ name: 'List Content', value: 'listContent', description: 'Paginated post history with filters', action: 'List posts' },
			{ name: 'Check Status', value: 'checkStatus', description: 'Poll an async publish by requestId', action: 'Check publish status' },
			{ name: 'Publish Draft', value: 'publishDraft', description: 'Dispatch a saved draft for publishing', action: 'Publish a draft' },
			{ name: 'Publish Now', value: 'publishNow', description: 'Force-publish a scheduled post immediately', action: 'Publish a scheduled post now' },
			{ name: 'Submit for Approval', value: 'submitForApproval', description: 'Send a draft to the approval queue', action: 'Submit a draft for approval' },
			{ name: 'Approve Post', value: 'approvePost', description: 'Approve a pending post and dispatch it', action: 'Approve a pending post' },
			{ name: 'Reject Post', value: 'rejectPost', description: 'Return a pending post to draft', action: 'Reject a pending post' },
			{ name: 'Retry Failed', value: 'retryFailed', description: 'Retry failed platform channels', action: 'Retry failed channels' },
			{ name: 'Delete Content', value: 'deleteContent', description: 'Delete a post or draft', action: 'Delete a post' },
		],
		default: 'createText',
	},
	{
		displayName: 'Connections',
		name: 'connections',
		type: 'string',
		typeOptions: { multipleValues: true },
		default: [],
		description:
			'Connection slugs to publish to, e.g. <code>instagram-mybrand</code>, <code>x-myhandle</code>. Find them in Dashboard → Connected Accounts.',
		displayOptions: show([...CREATE_OPS]),
		required: true,
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { alwaysOpenEditWindow: true, rows: 5 },
		default: '',
		description: 'Post text. Per-platform character limits are enforced by Socifyr.',
		displayOptions: show(['createText']),
		required: true,
	},
	{
		displayName: 'Media',
		name: 'medias',
		type: 'string',
		typeOptions: { multipleValues: true },
		default: [],
		description:
			'Media library IDs or public URLs (https://...). Raw file upload is not available in n8n — host the file or import it into the media library first.',
		displayOptions: show(MEDIA_OPS),
		required: true,
	},
	{
		displayName: 'Content ID',
		name: 'contentId',
		type: 'string',
		default: '',
		description: 'The <code>uploadId</code> (or <code>draftId</code>) returned by Socifyr.',
		displayOptions: show(ID_OPS),
		required: true,
	},
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		default: '',
		description: 'The <code>requestId</code> returned by an async publish.',
		displayOptions: show(['checkStatus']),
		required: true,
	},
	{
		displayName: 'Rows (JSON)',
		name: 'bulkRows',
		type: 'json',
		default: '',
		description:
			'Array of <code>{ text, connections, scheduledAt?, title? }</code> objects (max 500). Provide either this or CSV.',
		displayOptions: show(['bulkSchedule']),
	},
	{
		displayName: 'CSV',
		name: 'bulkCsv',
		type: 'string',
		default: '',
		description:
			'CSV body: <code>text,connections,scheduledAt,title</code> (connections space-separated). Provide either this or Rows (JSON).',
		displayOptions: show(['bulkSchedule']),
	},
	{
		displayName: 'Status',
		name: 'listStatus',
		type: 'options',
		options: STATUS_OPTIONS,
		default: '',
		displayOptions: show(['listContent']),
	},
	{
		displayName: 'Type',
		name: 'listType',
		type: 'options',
		options: [
			{ name: '(any)', value: '' },
			...['video', 'photo', 'text', 'document'].map((value) => ({ name: value, value })),
		],
		default: '',
		displayOptions: show(['listContent']),
	},
	{
		displayName: 'Platform',
		name: 'listPlatform',
		type: 'options',
		options: [{ name: '(any)', value: '' }, ...PLATFORM_OPTIONS],
		default: '',
		displayOptions: show(['listContent']),
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1,
		displayOptions: show(['listContent']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 20,
		displayOptions: show(['listContent']),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		// Create-post fields only: the bulk-schedule DTO accepts just rows/csv, and the
		// API rejects unknown properties (forbidNonWhitelisted) with a 400.
		displayOptions: show([...CREATE_OPS]),
		options: [
			{
				displayName: 'Async',
				name: 'async',
				type: 'boolean',
				default: false,
				description: 'Return a requestId immediately instead of waiting for publishing to finish.',
			},
			{
				displayName: 'Content Format',
				name: 'contentFormat',
				type: 'options',
				options: CONTENT_FORMAT_OPTIONS,
				default: 'short_video',
				description: 'Reels/Shorts/TikTok use <code>short_video</code>; Stories use <code>story</code>.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Long-form description (LinkedIn, YouTube, Facebook).',
			},
			{
				displayName: 'First Comment',
				name: 'firstComment',
				type: 'string',
				default: '',
				description: 'Instagram/X first comment text.',
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description: 'Reuse the same key on retries to avoid duplicate posts.',
			},
			{
				displayName: 'Platform Options (JSON)',
				name: 'platformOptions',
				type: 'json',
				default: '',
				description:
					'Per-platform knobs keyed by slug prefix, e.g. <code>{ "youtube-...": { "privacy": "public" } }</code>.',
			},
			{
				displayName: 'Save as Draft',
				name: 'saveDraft',
				type: 'boolean',
				default: false,
				description: 'Store as a draft instead of publishing (then use the Publish Draft operation).',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'dateTime',
				default: '',
				description: 'UTC datetime to publish at. Must be in the future.',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: '',
				description: 'IANA timezone applied to naive <code>scheduledAt</code> values, e.g. <code>Asia/Kathmandu</code>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Caption/title fallback (max 500 chars).',
			},
		],
	},
];

export class SocifyrNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Socifyr',
		name: 'socifyr',
		icon: 'file:socifyr.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Publish, schedule, and manage social posts across 18 platforms',
		defaults: { name: 'Socifyr' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'socifyrApi', required: true }],
		documentationUrl: 'https://socifyr.com/docs/integrations/n8n',
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('socifyrApi');
		const baseUrl = String(credentials.baseUrl || 'https://api.socifyr.com/api').replace(/\/+$/, '');
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const headers: Record<string, string> = {
					Accept: 'application/json',
					// The API key belongs to one workspace, so no workspace header is needed.
					Authorization: `Bearer ${credentials.apiKey as string}`,
				};

				let method: 'GET' | 'POST' | 'DELETE' = 'POST';
				let path = '';
				let body: Record<string, unknown> | undefined;
				let qs: Record<string, string | number | boolean> | undefined;

				const additional = (this.getNodeParameter('additionalFields', i, {}) ?? {}) as Record<
					string,
					unknown
				>;

				const cleanBody = (dto: Record<string, unknown>): IDataObject => {
					for (const key of Object.keys(dto)) {
						const value = dto[key];
						if (
							value === undefined ||
							value === null ||
							value === '' ||
							(Array.isArray(value) && value.length === 0)
						) {
							delete dto[key];
						}
					}
					return dto as IDataObject;
				};

				switch (operation) {
					case 'createText':
					case 'createPhotos':
					case 'createVideo':
					case 'createDocument': {
						path = `/content/${operation === 'createText' ? 'text' : operation === 'createPhotos' ? 'photos' : operation === 'createVideo' ? 'video' : 'document'}`;
						const dto: Record<string, unknown> = {
							connections: (this.getNodeParameter('connections', i, []) as unknown[]).map(String),
						};
						if (operation === 'createText') {
							dto.text = this.getNodeParameter('text', i, '') as string;
						} else {
							dto.medias = (this.getNodeParameter('medias', i, []) as unknown[]).map(String);
						}
						for (const [key, value] of Object.entries(additional)) {
							if (value !== '' && value !== undefined && value !== false) {
								dto[key] = value;
							}
						}
						body = cleanBody(dto);
						break;
					}
					case 'bulkSchedule': {
						path = '/content/bulk-schedule';
						const dto: Record<string, unknown> = {};
						const rows = this.getNodeParameter('bulkRows', i, undefined) as
							| unknown[]
							| string
							| undefined;
						const csv = this.getNodeParameter('bulkCsv', i, '') as string;
						if (Array.isArray(rows) && rows.length > 0) {
							dto.rows = rows;
						} else if (typeof rows === 'string' && rows.trim() !== '') {
							dto.rows = JSON.parse(rows);
						} else if (csv.trim() !== '') {
							dto.csv = csv;
						} else {
							throw new NodeOperationError(
								this.getNode(),
								'Provide either Rows (JSON) or CSV for Bulk Schedule',
								{ itemIndex: i },
							);
						}
						body = cleanBody(dto);
						break;
					}
					case 'getContent':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}`;
						method = 'GET';
						break;
					case 'checkStatus':
						path = '/content/status';
						method = 'GET';
						qs = { requestId: this.getNodeParameter('requestId', i) as string };
						break;
					case 'listContent': {
						path = '/content';
						method = 'GET';
						qs = {};
						for (const [param, key] of [
							['listStatus', 'status'],
							['listType', 'type'],
							['listPlatform', 'platform'],
							['page', 'page'],
							['limit', 'limit'],
						] as const) {
							const value = this.getNodeParameter(param, i, undefined) as
								| string
								| number
								| undefined;
							if (value !== undefined && value !== '') {
								qs[key] = value;
							}
						}
						break;
					}
					case 'publishDraft':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}/publish`;
						break;
					case 'publishNow':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}/publish-now`;
						break;
					case 'submitForApproval':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}/submit-for-approval`;
						break;
					case 'approvePost':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}/approve`;
						break;
					case 'rejectPost':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}/reject`;
						break;
					case 'retryFailed':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}/retry`;
						break;
					case 'deleteContent':
						path = `/content/${encodeURIComponent(this.getNodeParameter('contentId', i) as string)}`;
						method = 'DELETE';
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
							itemIndex: i,
						});
				}

				const response = await this.helpers.httpRequest({
					method,
					url: `${baseUrl}${path}`,
					headers,
					body,
					qs,
					json: true,
					timeout: 120_000,
				});

				const unwrapped = unwrapEnvelope(response);
				if (Array.isArray(unwrapped)) {
					for (const element of unwrapped) {
						returnData.push({ json: toDataItem(element), pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: toDataItem(unwrapped), pairedItem: { item: i } });
				}
			} catch (error) {
				if (error instanceof NodeOperationError) throw error;
				throw new NodeOperationError(this.getNode(), describeHttpError(error), {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}

/** Socifyr wraps all responses as { success, data } — surface `data` to n8n. */
function unwrapEnvelope(response: unknown): unknown {
	if (response && typeof response === 'object' && !Array.isArray(response)) {
		const obj = response as Record<string, unknown>;
		if ('success' in obj && 'data' in obj) {
			return obj.data;
		}
	}
	return response;
}

function toDataItem(value: unknown): IDataObject {
	if (value === null || value === undefined) return {};
	if (typeof value === 'object') return value as IDataObject;
	return { result: value as IDataObject };
}

function describeHttpError(error: unknown): string {
	const err = error as {
		message?: string;
		response?: { body?: unknown; statusCode?: number };
	};
	let detail = err.message ?? 'Request failed';
	const rawBody = err.response?.body;
	if (typeof rawBody === 'string') {
		try {
			const parsed = JSON.parse(rawBody) as { error?: string | string[] };
			if (parsed.error) {
				detail = Array.isArray(parsed.error) ? parsed.error.join('; ') : parsed.error;
			}
		} catch {
			if (rawBody.length < 300) detail = `${detail} — ${rawBody}`;
		}
	} else if (rawBody && typeof rawBody === 'object') {
		const parsed = rawBody as { error?: string | string[] };
		if (parsed.error) {
			detail = Array.isArray(parsed.error) ? parsed.error.join('; ') : parsed.error;
		}
	}
	if (err.response?.statusCode) detail = `${err.response.statusCode}: ${detail}`;
	return detail;
}
