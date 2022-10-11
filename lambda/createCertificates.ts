import {
	AttachPolicyCommand,
	AttachThingPrincipalCommand,
	CreateKeysAndCertificateCommand,
	CreateThingCommand,
	IoTClient,
} from '@aws-sdk/client-iot'
import {
	IoTDataPlaneClient,
	PublishCommand,
} from '@aws-sdk/client-iot-data-plane'
import { fromEnv } from '@nordicsemiconductor/from-env'

const { provisionedThingPolicyName } = fromEnv({
	provisionedThingPolicyName: 'PROVISIONED_THING_POLICY_NAME',
})(process.env)

const iot = new IoTClient({})
const iotData = new IoTDataPlaneClient({})

export const handler = async ({
	deviceId,
}: {
	deviceId: string
}): Promise<void> => {
	console.log(JSON.stringify({ deviceId }))

	// Create a new thing for the device
	await iot.send(
		new CreateThingCommand({
			thingName: deviceId,
		}),
	)
	console.log(`Created thing`, deviceId)

	// Create the credentials
	const cert = await iot.send(
		new CreateKeysAndCertificateCommand({
			setAsActive: true,
		}),
	)
	console.log(`Created certificate`, cert.certificateArn)

	// Attach the policy for provisioned devices to the credentials
	await iot.send(
		new AttachPolicyCommand({
			policyName: provisionedThingPolicyName,
			target: cert.certificateArn,
		}),
	)
	console.log(`Attached policy to certificate`)

	// Attach the credentials to the device
	await iot.send(
		new AttachThingPrincipalCommand({
			thingName: deviceId,
			principal: cert.certificateArn,
		}),
	)
	console.log(`Attached certificate to thing`)

	await Promise.all([
		iotData.send(
			new PublishCommand({
				topic: `certificate/${deviceId}/create/accepted/key`,
				payload: Buffer.from(cert.keyPair?.PrivateKey ?? ''),
				qos: 1,
			}),
		),
		iotData.send(
			new PublishCommand({
				topic: `certificate/${deviceId}/create/accepted/cert`,
				payload: Buffer.from(cert.certificatePem ?? ''),
				qos: 1,
			}),
		),
	])
	console.log(`Published certificate to MQTT`)
}
