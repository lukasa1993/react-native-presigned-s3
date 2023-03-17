import { defaultConfig, S3ClientConfig, S3Handlers } from './S3Client'
import RNFS from 'react-native-fs'
// @ts-ignore
import path from 'path-browserify'
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
  async add(key: string, filePath: string) {
    const { uri, meta } = await this.s3Handlers.get(key)
    this.downloads[key] = {
      key,
      filePath,
      meta,
      type: 'downloading',
    }

    await RNFS.mkdir(path.dirname(filePath))

    const { jobId, promise: downloader } = RNFS.downloadFile({
      fromUrl: uri,
      toFile: filePath,
      cacheable: false,
      background: true,
      discretionary: false,
      begin: () => {
        this.downloads[key].progress = 0
        this.notify(key, { type: 'downloading' })
      },
      progress: (p) => {
        this.downloads[key].progress = (p.bytesWritten * 100) / p.contentLength
        this.notify(key, { type: 'progress', data: this.downloads[key] })
      },
    })
    this.downloads[key].downloadId = jobId
    let data
    try {
      this.downloads[key].response = await downloader
      data = { ...this.downloads[key] }
    } catch (e) {
      this.downloads[key].error = e
      data = { ...this.downloads[key] }
    }
    delete this.downloads[key]
    this.notify(key, { type: 'completed', data })
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
