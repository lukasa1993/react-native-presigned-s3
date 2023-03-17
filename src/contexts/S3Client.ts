import Uploader from './uploader'
import Downloader from './downloader'
import RNFS from 'react-native-fs'
import { ListenerCB, notifyTypes, S3ClientConfig, S3Handlers, S3Item, S3ItemStorage } from '../types'
// @ts-ignore
import path from 'path-browserify'
export const defaultConfig: S3ClientConfig = {
  directory: 'ps3_dl',
  localCache: true,
  immediateDownload: true,
  appGroup: '_app_group_needed_',
}

export class S3Client {
  protected listeners: any
  protected listenersIndex: any
  protected items: S3ItemStorage
  protected uploader: Uploader
  protected downloader: Downloader
  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig

  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig) {
    this.listenersIndex = {}
    this.listeners = {}
    this.items = {}

    this.config = config
    this.s3Handlers = s3Handlers
    this.uploader = new Uploader(s3Handlers, config, this.notify.bind(this))
    this.downloader = new Downloader(s3Handlers, config, this.notify.bind(this))

    setImmediate(this.init.bind(this))
  }

  validateConfig() {
    if (this.config.appGroup === '_app_group_needed_') {
      console.error('App Group Needed Please provide')
      process.exit(-1)
    }
  }

  async init() {
    this.validateConfig()
    await RNFS.mkdir(this.localPath(''))
    await this.uploader.init()
    await this.downloader.init()
  }

  addUpload(key: string, filePath: string, meta?: any) {
    this.uploader.add(key, filePath, meta).then((item: S3Item) => {
      this.items[key] = item
      return this.notify(key, 'add')
    })
  }

  addDownload(key: string) {
    return this.downloader.add(key, this.localPath(key))
  }

  localPath(key: string) {
    return `${RNFS.CachesDirectoryPath}/${this.config.directory}/${key}`
  }

  async existsLocal(key: string) {
    return await RNFS.exists(this.localPath(key))
  }

  async remove(key: string) {
    await this.s3Handlers.remove(key)
    delete this.items[key]
    return this.notify(key, 'remove')
  }

  async list(prefix: string, reload: boolean = false) {
    if (Object.keys(this.items).length > 0 && !reload) {
      this.notify(prefix, 'all').catch((e) => console.error(e))
      return this.items
    }
    const uploads = this.uploader.list(prefix)
    const downloads = this.downloader.list(prefix)
    const remotes = await this.s3Handlers.list(prefix)

    let list: S3ItemStorage = { ...uploads }

    for (const remote of remotes) {
      let item: S3Item = {
        key: path.join(prefix, remote.key),
        name: remote.key,
        meta: remote.meta,
        state: 'remote',
      }

      if (downloads?.[remote.key]) {
        item = { ...item, ...downloads[remote.key] }
      } else if (await this.existsLocal(item.key)) {
        item.existsLocally = true
        item.filePath = this.localPath(item.key)
        item.state = 'local'
      }

      list[item.key] = item
    }

    this.items = list
    this.notify(prefix, 'all').catch((e) => console.error(e))
    return this.items
  }

  addListener(prefix: string, cb: ListenerCB) {
    if (!this.listenersIndex[prefix]) {
      this.listenersIndex[prefix] = 0
    }

    this.listenersIndex[prefix]++

    const id = `${prefix}_${this.listenersIndex[prefix]}`

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

  async notify(key: string, type: notifyTypes, item?: S3Item) {
    if (item) {
      this.items[key] = item
      if (type === 'uploaded' && this.items[key].filePath) {
        const localPath = this.localPath(this.items[key].key)

        await RNFS.mkdir(path.dirname(localPath))
        await RNFS.moveFile(this.items[key].filePath!, localPath)

        const stats = await RNFS.stat(localPath)

        this.items[key].filePath = path
        this.items[key].state = 'local'
        this.items[key].progress = undefined
        this.items[key].meta.size = stats.size
      } else if (type === 'downloaded') {
        this.items[key].existsLocally = true
        this.items[key].progress = undefined
        this.items[key].state = 'local'
      }
    } else if (type === 'remove') {
      delete this.items[key]
    }

    for (const lid in this.listeners) {
      const listener = this.listeners[lid]
      if (!key.startsWith(listener.prefix)) {
        continue
      }
      try {
        listener.cb(
          key,
          type,
          Object.values(this.items).filter((i) => {
            return i.key.startsWith(listener.prefix)
          })
        )
      } catch (_) {}
    }
  }
}
