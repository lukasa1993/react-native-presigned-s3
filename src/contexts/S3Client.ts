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
  protected listeners: any
  protected listenersIndex: any
  protected uploader: Uploader
  protected downloader: Downloader
  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig

  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig) {
    this.listenersIndex = {}
    this.listeners = {}

    this.config = config
    this.s3Handlers = s3Handlers
    this.uploader = new Uploader(s3Handlers, config, this.notify.bind(this))
    this.downloader = new Downloader(s3Handlers, config, this.notify.bind(this))

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

  async remove(key: string) {
    await this.s3Handlers.remove(key)
    this.notify(key, { type: 'removed' })
  }

  async list(prefix: string) {
    return this.s3Handlers.list(prefix)
  }

  activeList(prefix: string) {
    const downloads = this.downloader.list(prefix)
    const uploads = this.uploader.list(prefix)

    return { downloads, uploads }
  }

  addListener(prefix: string, cb: any) {
    if (!this.listenersIndex[prefix]) {
      this.listenersIndex[prefix] = 0
    }

    this.listenersIndex[prefix]++

    const id = prefix + '_' + this.listenersIndex[prefix]

    this.listeners[id] = {
      prefix,
      cb,
    }

    return id
  }

  removeListener(id: string) {
    const { prefix } = this.listeners[id]

    this.listenersIndex[prefix]--

    if (this.listenersIndex[prefix] <= 0) {
      delete this.listenersIndex[prefix]
    }

    delete this.listenersIndex[id]
  }

  notify(key: string, data: any) {
    for (const lid in this.listeners) {
      const listener = this.listeners[lid]
      if (key.startsWith(listener.prefix)) {
        try {
          listener.cb(key, data)
        } catch (_) {}
      }
    }
  }
}
