import Uploader from './uploader'
import Downloader from './downloader'

export type S3Handlers = {
  create: (payload: any) => Promise<any>
  list: (prefix: string) => Promise<any>
  remove: (key: string) => Promise<any>
  get: (key: string) => Promise<any>
}

export type S3ClientConfig = {}

export const defaultConfig: S3ClientConfig = {}

export class S3Client {
  protected uploader: Uploader
  protected downloader: Downloader
  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig

  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig) {
    this.config = config
    this.s3Handlers = s3Handlers
    this.uploader = new Uploader(s3Handlers, config)
    this.downloader = new Downloader()

    setImmediate(() => this.init())
  }

  async init() {
    await this.uploader.init()
    await this.downloader.init()
  }

  addUpload(key: string, filePath: string, meta?: any) {
    return this.uploader.add(key, filePath, meta)
  }

  addDownload(key: string) {
    this.downloader.add(key)
  }
}
