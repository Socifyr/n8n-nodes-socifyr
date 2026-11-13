import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class SocifyrApi implements ICredentialType {
	name = 'socifyrApi';

	displayName = 'Socifyr API';

	documentationUrl = 'https://socifyr.com/docs/integrations/n8n';

	icon: Icon = 'file:socifyr.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			description:
				'Socifyr API key (starts with <code>sk_</code>). Create one in Dashboard → API Keys. Keys can carry agent guardrails (daily post limits, X spend caps, require-approval) — see the docs.',
			placeholder: 'sk_...',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.socifyr.com/api',
			description:
				'Change only for self-hosted instances (e.g. <code>http://localhost:8101/api</code>).',
		},
	];
}
