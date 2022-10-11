import { App } from 'aws-cdk-lib'
import { FleetProvisioningStack } from './FleetProvisioningStack'
import { PackedLambda } from './util/packLambda'
import { PackedLayer } from './util/packLayer'

export class FleetProvisioningApp extends App {
	constructor({
		lambdaSources: { createCertificates },
		layer,
	}: {
		lambdaSources: {
			createCertificates: PackedLambda
		}
		layer: PackedLayer
		context?: Record<string, any>
	}) {
		super()
		new FleetProvisioningStack(this, {
			stackName: 'fleet-provisioning',
			lambdaSources: {
				createCertificates,
			},
			layer,
		})
	}
}
