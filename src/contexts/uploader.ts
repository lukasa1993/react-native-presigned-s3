import { Platform } from 'react-native'
import { defaultConfig, S3ClientConfig, S3Handlers } from './S3Client'
import Upload, { MultipartUploadOptions } from 'react-native-background-upload'

export default class Uploader {
  protected uploads: any
  protected queue: any
  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig
  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig) {
    this.uploads = {}
    this.s3Handlers = s3Handlers
    this.config = config
  }

  async init() {}
  async add(key: string, filePath: string, meta?: { payload: any; extra: any; type: string }) {
    const { extra, payload, type } = meta || { payload: {}, extra: {}, type: 'binary/octet-stream' }

    this.uploads[key] = {
      key,
      filePath,
      meta,
    }
    const s3Params = await this.s3Handlers.create({ key, type: type })
    const url = s3Params.url
    const fields = s3Params.fields

    const options: MultipartUploadOptions = {
      url,
      path: Platform.OS === 'ios' ? `file://${filePath}` : filePath,
      // path: filePath,
      method: 'POST',
      type: 'multipart',
      field: 'file',
      parameters: {
        ...fields,
        'x-amz-meta-json': JSON.stringify(payload),
        ...extra,
        'Content-Type': type,
      },
      headers: {
        'Content-Type': type,
      },
      notification: {
        enabled: false,
      },
      appGroup: 'group.com.example.app',
    }

    console.log({ options })

    try {
      this.uploads[key].uploadId = await Upload.startUpload(options)
    } catch (e) {
      console.error(e)
    }
    console.log(this.uploads[key])
    Upload.addListener('error', this.uploads[key].uploadId, (data) => {
      console.log('e', data)
    })
    Upload.addListener('completed', this.uploads[key].uploadId, (data) => {
      console.log('c', data)
    })
  }

  cancel(key: string) {
    return Upload.cancelUpload(this.uploads?.[key]?.uploadId)
  }
}
