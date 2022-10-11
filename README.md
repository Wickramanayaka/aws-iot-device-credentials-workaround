# aws-iot-device-credentials-workaround

Demonstrate how to use fleet provisioning via non-standard MQTT API to
circumvent the 2k buffer size limit in the nRF9160 modem

## Authenticate against AWS

For example using direnv, export these environment variables

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=...
```

## Deploy the solution

```bash
npm ci
npx cdk bootstrap # Only needed once per AWS account and region
npx cdk deploy
```

## Create provisioning credentials

These credentials are to be used for the provisioning only, they cannot be used
for regular AWS IoT thing operations. They are intended to be provisioned to
many devices.

Run this command to create a new set of credentials, and attach
[the policy that allows devices to request new certificates](./cdk/resources/UnprovisionedCertificatePolicy.ts):

```bash
npx tsx create-provision-certificate.ts
```

## Provision a device

Run the command to connect using the provisioning credentials created above:

```bash
npx tsx provision.ts <certificate ID>
```

This will connect to the AWS IoT broker using a random device ID, and publish a
blank message to the topic `certificate/${deviceId}/create`.
([Source](./device/provision.ts))

The [lambda function](./lambda/createCertificates.ts) that receives this
message, will create a new certificate and keypair, attach
[the policy for provisioned devices](./cdk/resources/ProvisionedCertificatePolicy.ts)
to the certificate, create a Thing for the device, and attach the certificate to
the Thing.

It then publishes the private key on the topic
`certificate/${deviceId}/create/accepted/key`, and the certificate on the topic
`certificate/${deviceId}/create/accepted/cert`.

> **Warning**  
> The messages can be received by any client that has access to the provisioning
> credentials. If these credentials are compromised, an attacker can acquire new
> valid credentials to connect as a trusted device, and prevent genuine devices
> from connecting.

## Connect using provisioned credentials

Finally, run this command to connect with credentials created during the
provisioning step:

```bash
npx tsx connect.ts <device ID>
```
