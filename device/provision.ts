import { mqtt } from 'aws-iot-device-sdk-v2'
import chalk from 'chalk'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { TextDecoder } from 'util'
import { connect } from './connect'

const { gray, blue, magenta, green, yellow } = chalk

export const provision = async ({
	privateKeyFile,
	certificateFile,
	brokerHostname,
	deviceId,
}: {
	privateKeyFile: string
	certificateFile: string
	brokerHostname: string
	deviceId: string
}): Promise<void> => {
	const requestCertificateTopic = `certificate/${deviceId}/create`
	const requestCertificateAccepted = `${requestCertificateTopic}/accepted/+`

	console.debug(gray(`Connecting ${deviceId}...`))

	const c = await connect({
		privateKeyFile,
		certificateFile,
		brokerHostname,
		deviceId,
	})

	console.debug(gray(`Connected!`))

	const decoder = new TextDecoder('utf8')
	console.debug(gray(`Subscribing to`), blue.dim(requestCertificateAccepted))

	const p = new Promise<void>((resolve, reject) => {
		const provisionTimeout = setTimeout(() => {
			reject(new Error(`Provisioning timed out!`))
		}, 60 * 1000)

		const certParts: {
			key: boolean
			cert: boolean
		} = { key: false, cert: false }

		c.subscribe(
			requestCertificateAccepted,
			mqtt.QoS.AtLeastOnce,
			(topic, payload) => {
				console.debug(
					gray(`<`),
					blue.dim(topic),
					gray(`${payload.byteLength} bytes`),
				)
				console.debug(magenta(decoder.decode(payload)))
				const type = topic.split('/').pop()
				switch (type) {
					case 'key':
					case 'cert':
						const outFile = path.join(
							process.cwd(),
							'certificates',
							`${deviceId}.pem.${type === 'cert' ? 'crt' : 'key'}`,
						)
						writeFile(outFile, Buffer.from(payload), 'binary')
						console.debug(blue.dim(outFile), gray('written'))
						certParts[type] = true
						break
					default:
						throw new Error(`Unexpected topic: ${topic}`)
				}

				if (certParts.cert && certParts.key) {
					console.debug(green(`Received new credentials for`), yellow(deviceId))
					clearTimeout(provisionTimeout)
					resolve()
				}
			},
		)
	})

	console.debug(gray(`Publishing to`), blue.dim(requestCertificateTopic))
	await c.publish(requestCertificateTopic, '', mqtt.QoS.AtLeastOnce)

	await p

	await c.disconnect()
}
