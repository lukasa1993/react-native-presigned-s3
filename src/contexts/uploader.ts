import { Platform } from 'react-native'
import { defaultConfig } from './S3Client'
import Upload, { MultipartUploadOptions } from 'react-native-background-upload'
import { notifyCB, S3ClientConfig, S3Handlers, S3Item } from '../types'
// @ts-ignore
import path from 'path-browserify'
export default class Uploader {
  protected uploads: { [key: string]: S3Item }
  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig
  protected notify: notifyCB

  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig, notify: notifyCB) {
    this.uploads = {}
    this.s3Handlers = s3Handlers
    this.config = config
    this.notify = notify
  }

  async init() {}

  async add(key: string, filePath: string, meta?: { payload: any; extra: any; type: string }): Promise<S3Item> {
    const { extra, payload, type } = meta || { payload: {}, extra: {}, type: 'binary/octet-stream' }

    this.uploads[key] = {
      key,
      name: path.basename(key),
      filePath,
      meta,
      state: 'uploading',
    }
    const s3Params = await this.s3Handlers.create({ key, type: type })
    const url = s3Params.url
    const fields = s3Params.fields

    const options: MultipartUploadOptions = {
      url,
      path: Platform.OS === 'ios' ? `file://${filePath}` : filePath,
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

    try {
      this.uploads[key].uploadId = await Upload.startUpload(options)
    } catch (e) {
      console.error(e)
    }

    // @ts-ignore
    Upload.addListener('progress', this.uploads[key].uploadId, (data) => {
      this.uploads[key].progress = data.progress
      this.notify(key, 'progress', this.uploads[key])
    })

    // @ts-ignore
    Upload.addListener('error', this.uploads[key].uploadId, (err) => {
      this.uploads[key].error = err
      const data: S3Item = { ...this.uploads[key] }
      delete this.uploads[key]
      this.notify(key, 'error', data)
    })

    // @ts-ignore
    Upload.addListener('completed', this.uploads[key].uploadId, (res: any) => {
      this.uploads[key].response = res
      const data: S3Item = { ...this.uploads[key] }
      delete this.uploads[key]
      this.notify(key, 'uploaded', data)
    })

    // @ts-ignore
    Upload.addListener('cancelled', this.uploads[key].uploadId, () => {
      const data: S3Item = { ...this.uploads[key] }
      delete this.uploads[key]
      this.notify(key, 'remove', data)
    })

    return this.uploads[key]
  }

  cancel(key: string) {
    return Upload.cancelUpload(this.uploads?.[key]?.uploadId!)
  }

  list(prefix: string) {
    const files: { [key: string]: S3Item } = {}

    for (const uploadKey in this.uploads) {
      if (uploadKey.startsWith(prefix)) {
        files[uploadKey] = this.uploads[uploadKey]
      }
    }
    return files
  }
}
