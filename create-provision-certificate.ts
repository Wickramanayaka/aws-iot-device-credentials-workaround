import { CloudFormationClient } from '@aws-sdk/client-cloudformation'
import {
	AttachPolicyCommand,
	CreateKeysAndCertificateCommand,
	IoTClient,
} from '@aws-sdk/client-iot'
import { stackOutput } from '@nordicsemiconductor/cloudformation-helpers'
import chalk from 'chalk'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { StackOutputs } from './cdk/FleetProvisioningStack'

const { magenta, yellow, blue, gray, green } = chalk

const cf = new CloudFormationClient({})
const iot = new IoTClient({})

const { unprovisionedCertificatePolicyName } = await stackOutput(cf)<
	typeof StackOutputs
>('fleet-provisioning')

console.debug(
	magenta('Policy name:'),
	yellow(unprovisionedCertificatePolicyName),
)

const certsDir = path.join(process.cwd(), 'certificates')
try {
	await stat(certsDir)
	console.debug(blue.dim(certsDir), gray('exists'))
} catch {
	await mkdir(certsDir)
	console.debug(green.dim(certsDir), gray('created'))
}

const cert = await iot.send(
	new CreateKeysAndCertificateCommand({
		setAsActive: true,
	}),
)

const keyFile = path.join(certsDir, `${cert.certificateId}.pem.key`)
const certFile = path.join(certsDir, `${cert.certificateId}.pem.crt`)
await writeFile(keyFile, cert.keyPair?.PrivateKey ?? '', 'utf-8')
console.debug(blue.dim(keyFile), gray('written'))
await writeFile(certFile, cert.certificatePem ?? '', 'utf-8')
console.debug(blue.dim(certFile), gray('written'))

await iot.send(
	new AttachPolicyCommand({
		policyName: unprovisionedCertificatePolicyName,
		target: cert.certificateArn,
	}),
)
console.debug(
	gray(`Attached policy`),
	blue.dim(unprovisionedCertificatePolicyName),
	gray(`to certificate`),
	blue.dim(cert.certificateArn),
)

console.debug(magenta(`Credential ID`), yellow(cert.certificateId))

console.log('')
console.log(green(`You can now provision a new device using`))
console.log(blue(`npx tsx provision.ts`), yellow.dim(cert.certificateId))
