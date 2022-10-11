import { App, CfnOutput, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib'
import IAM from 'aws-cdk-lib/aws-iam'
import IoT from 'aws-cdk-lib/aws-iot'
import Lambda from 'aws-cdk-lib/aws-lambda'
import CloudWatchLogs from 'aws-cdk-lib/aws-logs'
import { ProvisionedCertificatePolicy } from './resources/ProvisionedCertificatePolicy'
import { UnprovisionedCertificatePolicy } from './resources/UnprovisionedCertificatePolicy'
import { PackedLambda } from './util/packLambda'
import { PackedLayer } from './util/packLayer'

/**
 * Defines the names use for stack outputs, which are used below to ensure
 * that the names of output variables are correct across stacks.
 */
export const StackOutputs = {
	unprovisionedCertificatePolicyName: `unprovisionedCertificatePolicyName`,
} as const

export class FleetProvisioningStack extends Stack {
	public constructor(
		parent: App,
		{
			stackName,
			layer,
			lambdaSources: { createCertificates },
		}: {
			stackName: string
			lambdaSources: {
				createCertificates: PackedLambda
			}
			layer: PackedLayer
		},
	) {
		super(parent, stackName)

		// Policy used by provisioned devices
		const unprovisionedCertificatePolicy = new UnprovisionedCertificatePolicy(
			this,
			'unprovisionedCertificatePolicy',
		).policy
		new CfnOutput(this, 'unprovisionedCertificatePolicyName', {
			value: unprovisionedCertificatePolicy.ref,
			exportName: StackOutputs.unprovisionedCertificatePolicyName,
		})

		// Policy assigned to provisioned devices
		const provisionedThingPolicy = new ProvisionedCertificatePolicy(
			this,
			'provisionedCertificatePolicy',
		).policy

		// Lambda function

		const baseLayer = new Lambda.LayerVersion(this, 'baseLayer', {
			code: Lambda.Code.fromAsset(layer.layerZipFile),
			compatibleArchitectures: [Lambda.Architecture.ARM_64],
			compatibleRuntimes: [Lambda.Runtime.NODEJS_16_X],
		})

		const createCertificatesLambda = new Lambda.Function(
			this,
			'createCertificates',
			{
				handler: createCertificates.handler,
				architecture: Lambda.Architecture.ARM_64,
				runtime: Lambda.Runtime.NODEJS_16_X,
				timeout: Duration.minutes(1),
				memorySize: 1792,
				code: Lambda.Code.fromAsset(createCertificates.lambdaZipFile),
				layers: [baseLayer],
				description:
					'Receives certificate creation requests from devices, creates them and sends them via MQTT to the device',
				initialPolicy: [
					new IAM.PolicyStatement({
						resources: ['*'],
						actions: [
							'iot:CreateThing',
							'iot:CreateKeysAndCertificate',
							'iot:AttachPolicy',
							'iot:AttachThingPrincipal',
							'iot:Publish',
						],
					}),
				],
				environment: {
					PROVISIONED_THING_POLICY_NAME: provisionedThingPolicy.ref,
				},
			},
		)

		new CloudWatchLogs.LogGroup(this, 'LogGroup', {
			removalPolicy: RemovalPolicy.DESTROY,
			logGroupName: `/aws/lambda/${createCertificatesLambda.functionName}`,
			retention: CloudWatchLogs.RetentionDays.ONE_DAY,
		})

		const errorTopicRole = new IAM.Role(this, 'errorTopicRole', {
			assumedBy: new IAM.ServicePrincipal('iot.amazonaws.com'),
			inlinePolicies: {
				rootPermissions: new IAM.PolicyDocument({
					statements: [
						new IAM.PolicyStatement({
							actions: ['iot:Publish'],
							resources: [
								`arn:aws:iot:${this.region}:${this.account}:topic/errors`,
							],
						}),
					],
				}),
			},
		})

		const createCertificateRequestRule = new IoT.CfnTopicRule(
			this,
			'createCertificateRequestRule',
			{
				topicRulePayload: {
					description: `Invokes the lambda function which creates certificates`,
					ruleDisabled: false,
					awsIotSqlVersion: '2016-03-23',
					sql: `SELECT clientid() as deviceId FROM 'certificate/+/create'`,
					actions: [
						{
							lambda: {
								functionArn: createCertificatesLambda.functionArn,
							},
						},
					],
					errorAction: {
						republish: {
							roleArn: errorTopicRole.roleArn,
							topic: 'errors',
						},
					},
				},
			},
		)

		createCertificatesLambda.addPermission('invokeByMemfaultRule', {
			principal: new IAM.ServicePrincipal('iot.amazonaws.com'),
			sourceArn: createCertificateRequestRule.attrArn,
		})
	}
}
