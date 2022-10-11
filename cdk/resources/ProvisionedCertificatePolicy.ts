import { Resource } from 'aws-cdk-lib'
import { CfnPolicy } from 'aws-cdk-lib/aws-iot'
import { Construct } from 'constructs'

/**
 * Policy attached to the credentials created for provisioned devices
 */
export class ProvisionedCertificatePolicy extends Resource {
	public readonly policy: CfnPolicy
	constructor(scope: Construct, id: string) {
		super(scope, id)
		this.policy = new CfnPolicy(this, 'policy', {
			policyDocument: {
				Version: '2012-10-17',
				Statement: [
					{
						Effect: 'Allow',
						Action: ['iot:Connect'],
						Resource: ['arn:aws:iot:*:*:client/${iot:ClientId}'],
						Condition: {
							Bool: {
								'iot:Connection.Thing.IsAttached': [true],
							},
						},
					},
					{
						Effect: 'Allow',
						Action: ['iot:Receive'],
						Resource: ['*'],
					},
					{
						Effect: 'Allow',
						Action: ['iot:Subscribe'],
						Resource: [
							'arn:aws:iot:*:*:topicfilter/$aws/things/${iot:ClientId}/*',
						],
					},
					{
						Effect: 'Allow',
						Action: ['iot:Publish'],
						Resource: ['arn:aws:iot:*:*:topic/$aws/things/${iot:ClientId}/*'],
					},
				],
			},
		})
	}
}
