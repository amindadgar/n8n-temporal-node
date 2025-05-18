import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class Temporal implements ICredentialType {
	name = 'temporal';
	displayName = 'Temporal';
	documentationUrl = 'https://docs.temporal.io/develop/typescript';
	properties: INodeProperties[] = [
		{
			displayName: 'Server Address',
			name: 'address',
			type: 'string',
			default: 'localhost:7233',
			description: 'The address of the Temporal server',
			required: true,
		},
		{
			displayName: 'Namespace',
			name: 'namespace',
			type: 'string',
			default: 'default',
			description: 'The namespace to use for Temporal operations',
			required: true,
		},
		{
			displayName: 'TLS Certificate Path',
			name: 'tlsCertPath',
			type: 'string',
			default: '',
			description: 'Path to the TLS certificate file (optional)',
			required: false,
		},
		{
			displayName: 'TLS Key Path',
			name: 'tlsKeyPath',
			type: 'string',
			default: '',
			description: 'Path to the TLS key file (optional)',
			required: false,
		},
	];
}
