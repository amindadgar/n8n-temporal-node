import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class TemporalApi implements ICredentialType {
	name = 'temporalApi';
	displayName = 'Temporal API';
	documentationUrl = 'https://docs.temporal.io/develop/typescript';
	properties: INodeProperties[] = [
		{
			displayName: 'Server Address',
			name: 'address',
			type: 'string',
			default: 'localhost:7233',
			description: 'The address of the Temporal server (host:port format)',
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
			displayName: 'Connection Timeout (seconds)',
			name: 'connectTimeout',
			type: 'number',
			default: 10,
			description: 'Timeout in seconds for connecting to the Temporal server',
			required: false,
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

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		// This method can be used for HTTP-based authentication if needed
		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'http://{{$credentials.address}}',
			url: '/api/v1/namespaces/{{$credentials.namespace}}',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 200,
					message: 'Connection to Temporal server successful',
				},
			},
		],
	};
} 