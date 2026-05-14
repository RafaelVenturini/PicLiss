import 'dotenv/config'
import Fastify from 'fastify'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const fastify = Fastify({ logger: true })

const s3 = new S3Client({
  region: process.env.BUCK_REGION,
  endpoint: process.env.BUCK_URL,
  credentials: {
    accessKeyId: process.env.BUCK_PUB_ACCESS_ID!,
    secretAccessKey: process.env.BUCK_PUB_ACCESS_KEY!
  }
})

fastify.get('/image', async (request, reply) => {
  const { path } = request.query as { path?: string }

  if (!path) {
    return reply.code(400).send({ error: 'Path query parameter is required' })
  }

  try {
    const key = path.startsWith('/') ? path.slice(1) : path

    const command = new GetObjectCommand({
      Bucket: process.env.BUCK_PUB_NAME,
      Key: key
    })

    const response = await s3.send(command)

    reply.header('Content-Type', response.ContentType || 'application/octet-stream')
    return reply.send(response.Body)
  } catch (err: any) {
    if (err.name === 'NoSuchKey') {
      return reply.code(404).send({ error: 'Image not found' })
    }
    fastify.log.error(err)
    return reply.code(500).send({ error: 'Failed to fetch image' })
  }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
