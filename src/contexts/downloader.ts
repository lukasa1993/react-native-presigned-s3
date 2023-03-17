import { defaultConfig, S3ClientConfig, S3Handlers } from './S3Client'

export default class Downloader {
  protected downloads: any

  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig
  protected notify: (key: string, data: any) => void
  constructor(
    s3Handlers: S3Handlers,
    config: S3ClientConfig = defaultConfig,
    notify: (key: string, data: any) => void
  ) {
    this.downloads = {}
    this.s3Handlers = s3Handlers
    this.config = config
    this.notify = notify
  }

  async init() {}
  add(key: string) {
    this.downloads[key] = {
      key,
    }
  }

  list(prefix: string) {
    const files = []

    for (const downloadKey in this.downloads) {
      if (`${downloadKey}`.startsWith(prefix)) {
        files.push(this.downloads[downloadKey])
      }
    }
    return files
  }
}
