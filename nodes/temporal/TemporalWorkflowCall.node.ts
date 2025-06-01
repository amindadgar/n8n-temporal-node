import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import { Connection, Client } from '@temporalio/client';
import { promises as fs } from 'fs';

export class TemporalWorkflowCall implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Temporal Workflow Call',
		name: 'temporalWorkflowCall',
		icon: 'file:temporalio.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute Temporal workflows',
		defaults: {
			name: 'Temporal Workflow Call',
		},
		// use the enum
		inputs:  [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],

		credentials: [
			{
				name: 'temporalApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Start Workflow',
						value: 'startWorkflow',
						description: 'Start a new workflow execution',
						action: 'Start a new workflow execution',
					},
					{
						name: 'Get Workflow Status',
						value: 'getWorkflowStatus',
						description: 'Get the status of a workflow execution',
						action: 'Get the status of a workflow execution',
					},
					{
						name: 'Test Connection',
						value: 'testConnection',
						description: 'Test the connection to the Temporal server',
						action: 'Test the connection to the Temporal server',
					},
				],
				default: 'startWorkflow',
			},
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['startWorkflow', 'getWorkflowStatus'],
					},
				},
				description: 'The ID of the workflow',
			},
			{
				displayName: 'Workflow Type',
				name: 'workflowType',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['startWorkflow'],
					},
				},
				description: 'The type of the workflow to execute',
			},
			{
				displayName: 'Task Queue',
				name: 'taskQueue',
				type: 'string',
				default: 'default',
				required: true,
				displayOptions: {
					show: {
						operation: ['startWorkflow'],
					},
				},
				description: 'The task queue to use for the workflow',
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						operation: ['startWorkflow'],
					},
				},
				description: 'The input to pass to the workflow',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		const credentials = await this.getCredentials('temporalApi');
		
		let tlsConfig = undefined;
		if (credentials.tlsCertPath && credentials.tlsKeyPath) {
			const [certBuffer, keyBuffer] = await Promise.all([
				fs.readFile(credentials.tlsCertPath as string),
				fs.readFile(credentials.tlsKeyPath as string),
			]);
			tlsConfig = {
				clientCertPair: {
					crt: certBuffer,
					key: keyBuffer,
				},
			};
		}

		// Get connection timeout from credentials or use default
		const connectTimeoutMs = ((credentials.connectTimeout as number) || 10) * 1000;

		let connection;
		try {
			connection = await Connection.connect({
				address: credentials.address as string,
				tls: tlsConfig,
				connectTimeout: connectTimeoutMs,
			});
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 
				new Error(`Failed to connect to Temporal server at ${credentials.address}: ${error.message}. Please verify that:\n1. The Temporal server is running\n2. The address is correct (format: host:port)\n3. Network connectivity is available\n4. TLS settings are correct if using TLS`),
				{ itemIndex: 0 }
			);
		}

		const client = new Client({
			connection,
			namespace: credentials.namespace as string,
		});

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'startWorkflow') {
					const workflowId = this.getNodeParameter('workflowId', i) as string;
					const workflowType = this.getNodeParameter('workflowType', i) as string;
					const taskQueue = this.getNodeParameter('taskQueue', i) as string;
					const input = this.getNodeParameter('input', i) as string;
					const parsedInput = JSON.parse(input);

					const handle = await client.workflow.execute(workflowType, {
						workflowId,
						taskQueue,
						args: [parsedInput],
					});

					returnData.push({
						json: {
							result: handle,
						},
					});
				} else if (operation === 'getWorkflowStatus') {
					const workflowId = this.getNodeParameter('workflowId', i) as string;
					const handle = client.workflow.getHandle(workflowId);
					const status = await handle.describe();

					returnData.push({
						json: {
							workflowId: status.workflowId,
							runId: status.runId,
							status: status.status.name,
							startTime: status.startTime,
							closeTime: status.closeTime,
						},
					});
				} else if (operation === 'testConnection') {
					// Test connection by getting system info
					try {
						// The connection was already established above, so if we get here, it worked
						returnData.push({
							json: {
								success: true,
								message: 'Successfully connected to Temporal server',
								serverAddress: credentials.address,
								namespace: credentials.namespace,
								timestamp: new Date().toISOString(),
							},
						});
					} catch (testError) {
						returnData.push({
							json: {
								success: false,
								message: `Connection test failed: ${testError.message}`,
								serverAddress: credentials.address,
								namespace: credentials.namespace,
								timestamp: new Date().toISOString(),
							},
						});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
