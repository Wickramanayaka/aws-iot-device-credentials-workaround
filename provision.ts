import { DescribeEndpointCommand, IoTClient } from '@aws-sdk/client-iot'
import chalk from 'chalk'
import { provision } from 'device/provision'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const { magenta, yellow, green, blue } = chalk

const certificateId = process.argv[process.argv.length - 1]
console.debug(magenta('Certificate ID'), yellow(certificateId))
const privateKeyFile = path.join(
	process.cwd(),
	'certificates',
	`${certificateId}.pem.key`,
)
const certificateFile = path.join(
	process.cwd(),
	'certificates',
	`${certificateId}.pem.crt`,
)
await stat(privateKeyFile)
await stat(certificateFile)

export const deviceId = `node-${Math.floor(Math.random() * 100000000)}`
console.debug(magenta('Device ID'), yellow(deviceId))

const brokerHostname = (
	await new IoTClient({}).send(
		new DescribeEndpointCommand({
			endpointType: 'iot:Data-ATS',
		}),
	)
).endpointAddress as string
console.debug(magenta('Endpoint'), yellow(brokerHostname))

await provision({
	deviceId,
	brokerHostname,
	privateKeyFile,
	certificateFile,
})

console.log('')
console.log(green(`You can now connect with the new credentials:`))
console.log(blue(`npx tsx connect.ts`), yellow.dim(deviceId))
