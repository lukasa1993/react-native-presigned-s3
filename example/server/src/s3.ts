import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import pMap from 'p-map'
import crypto from 'crypto'
import path from 'path'
import { Conditions as PolicyEntry } from '@aws-sdk/s3-presigned-post/dist-types/types'
import { _Object } from '@aws-sdk/client-s3/dist-types/models/models_0'
import { config } from 'dotenv'

config()

class S3 {
  private readonly bucket: string
  private readonly SPACES_KEY: string
  private readonly SPACES_SECRET: string
  private readonly s3_config: {
    endpoint: string
    credentials: { accessKeyId: string; secretAccessKey: string }
    region: string
    forcePathStyle: boolean
  }
  private readonly s3: S3Client

  constructor() {
    this.SPACES_KEY = process.env.SPACES_KEY
    this.SPACES_SECRET = process.env.SPACES_SECRET
    this.bucket = process.env.BUCKET

    if (!this.SPACES_KEY || !this.SPACES_SECRET || !this.bucket) {
      console.error('Envs missing', process.env)
      process.exit(-1)
    }

    this.s3_config = {
      forcePathStyle: false, // Configures to use subdomain/virtual calling format.
      region: 'us-east-1',
      endpoint: 'https://nyc3.digitaloceanspaces.com',
      credentials: {
        accessKeyId: this.SPACES_KEY,
        secretAccessKey: this.SPACES_SECRET,
      },
    }

    this.s3 = new S3Client(this.s3_config)
  }

  async create({ key = `tmp/${crypto.randomBytes(16).toString('hex')}`, type = 'binary/octet-stream' }) {
    const Key = key
    const Fields = {
      acl: 'private',
    }
    const Conditions: PolicyEntry[] = [
      { acl: 'private' },
      { 'Content-Type': decodeURIComponent(type) },
      { bucket: process.env.BUCKET },
      ['starts-with', '$key', decodeURIComponent(Key)],
      ['starts-with', '$x-amz-meta-json', ''],
      ['content-length-range', 1000, 524288000],
    ]

    const s3 = new S3Client(this.s3_config)

    const preSignedPost = await createPresignedPost(s3, {
      Bucket: this.bucket,
      Key,
      Conditions,
      Fields,
      Expires: 300,
    })

    preSignedPost.url = process.env.CDN ? `https://${process.env.CDN}` : preSignedPost.url

    return preSignedPost
  }

  async get(Key) {
    const command = new GetObjectCommand({
      Key,
      Bucket: this.bucket,
    })
    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 })
    const signed = new URL(url)
    signed.host = process.env.CDN ? process.env.CDN : signed.host
    return signed.href
  }

  async exists(Key) {
    try {
      const command = new HeadObjectCommand({
        Key,
        Bucket: this.bucket,
      })
      const head = await this.s3.send(command)

      if (head.ContentLength > 0) {
        return { head }
      } else {
        return null
      }
    } catch (e) {
      return null
    }
  }

  async meta(Key) {
    const command = new HeadObjectCommand({
      Key,
      Bucket: this.bucket,
    })

    try {
      const head = await this.s3.send(command)
      const { json } = head?.Metadata

      let metaJSON = {}
      try {
        metaJSON = JSON.parse(json)
      } catch (e) {}

      return {
        mime: head?.ContentType,
        hash: JSON.parse(head?.ETag),
        size: head?.ContentLength,
        ...metaJSON,
      }
    } catch (e) {
      return {}
    }
  }

  async remove(Key: string) {
    const command = new DeleteObjectCommand({
      Key,
      Bucket: this.bucket,
    })

    return await this.s3.send(command)
  }

  async list(Prefix, { url = false, meta = false } = {}) {
    let Contents: _Object[] | null = null

    const command = new ListObjectsCommand({
      Prefix,
      Bucket: this.bucket,
    })
    try {
      const _command = await this.s3.send(command)
      Contents = _command.Contents
    } catch (e) {
      console.log('cant_command', Prefix, this.bucket, e)
      return null
    }

    const list =
      (await pMap(Contents || [], async (content) => {
        let _url = null
        let _meta = null
        if (!!url) {
          try {
            _url = await this.get(content.Key)
          } catch (e) {
            console.log('cant_url', content.Key, e)
          }
        }
        if (!!meta) {
          try {
            _meta = await this.meta(content.Key)
          } catch (e) {
            console.log('cant_meta', content.Key, e)
          }
        }

        return {
          key: path.basename(content.Key),
          url: _url,
          meta: _meta,
          size: content.Size,
        }
      })) || []

    return list.filter((f) => !!f)
  }
}

export default new S3()
