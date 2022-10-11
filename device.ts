import { mqtt } from 'aws-iot-device-sdk-v2'
import { writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { TextDecoder } from 'util'
import { connect } from './connect'

const certificateId = `4e79400da8427cc1d3f63694bd76e5a92bbd16906a61ea03e09e1f8c970cd019`
const brokerHostname = `a2wbisbq0i92uj-ats.iot.eu-north-1.amazonaws.com`
const deviceId = `simulator-${Math.floor(Math.random() * 100000000)}`
// const requestCertificateTopic = `new-certificate/${deviceId}`;
// const requestCertificateAccepted = `${requestCertificateTopic}/accepted`;

const payloadFormat: 'json' | 'cbor' = 'json'
const requestCertificateTopic = `$aws/certificates/create/${payloadFormat}`
const requestCertificateAccepted = `${requestCertificateTopic}/accepted`

const privateKeyFile = path.join(
	process.cwd(),
	'certificate',
	`${certificateId}-private.pem.key`,
)
const certificateFile = path.join(
	process.cwd(),
	'certificate',
	`${certificateId}-certificate.pem.crt`,
)

console.log(`Device ID`, deviceId)
console.log(`Broker`, brokerHostname)
console.log(`Certificate`, certificateFile)
console.log(`Private key`, privateKeyFile)

console.log(`Connecting...`)

const c = await connect({
	privateKeyFile,
	certificateFile,
	brokerHostname,
	deviceId,
})

console.log(`Connected!`)

const decoder = new TextDecoder('utf8')
console.log(`Subscribing to`, requestCertificateAccepted)
await c.subscribe(
	requestCertificateAccepted,
	mqtt.QoS.AtLeastOnce,
	(topic, payload) => {
		console.log(
			`<`,
			topic,
			`${payload.byteLength} bytes`,
			decoder.decode(payload),
		)
		writeFile(
			path.join(process.cwd(), 'certificate', `new-cert.${payloadFormat}`),
			Buffer.from(payload),
			'binary',
		)
	},
)

console.log(`Publishing to`, requestCertificateTopic)
await c.publish(requestCertificateTopic, '', mqtt.QoS.AtLeastOnce)
