import path from 'node:path'
import { FleetProvisioningApp } from './FleetProvisioningApp'
import { packLambda } from './util/packLambda'
import { packLayer } from './util/packLayer'

const baseDir = path.join(process.cwd(), 'lambda')
const packagesInLayer = [
	'@aws-sdk/client-iot',
	'@aws-sdk/client-iot-data-plane',
	'@nordicsemiconductor/from-env',
]
const pack = async (id: string) =>
	packLambda({
		id,
		baseDir,
	})

new FleetProvisioningApp({
	lambdaSources: {
		createCertificates: await pack('createCertificates'),
	},
	layer: await packLayer({
		id: 'baseLayer',
		dependencies: packagesInLayer,
	}),
})
