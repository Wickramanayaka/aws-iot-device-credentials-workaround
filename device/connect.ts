import { iot } from 'aws-crt'
import { MqttClientConnection } from 'aws-crt/dist/native/mqtt'
import { mqtt } from 'aws-iot-device-sdk-v2'

export const connect = async ({
	certificateFile,
	privateKeyFile,
	deviceId: deviceId,
	brokerHostname: brokerHostname,
}: {
	certificateFile: string
	privateKeyFile: string
	deviceId: string
	brokerHostname: string
}): Promise<MqttClientConnection> => {
	const config_builder =
		iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(
			certificateFile,
			privateKeyFile,
		)

	config_builder.with_clean_session(true)
	config_builder.with_client_id(deviceId)
	config_builder.with_endpoint(brokerHostname)
	const config = config_builder.build()

	const client = new mqtt.MqttClient()
	const connection = client.new_connection(config)

	await connection.connect()

	return connection
}
