import RNFS from 'react-native-fs'
import { ListenerCB, notifyTypes, S3ClientConfig, S3Handlers, S3Item, S3ItemStorage } from '../types'
// @ts-ignore
import path from 'path-browserify'
import Upload, { MultipartUploadOptions } from 'react-native-background-upload'
import { Platform } from 'react-native'
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
  protected s3Handlers: S3Handlers

  protected config: S3ClientConfig

  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig) {
    this.listenersIndex = {}
    this.listeners = {}
    this.items = {}

    this.config = config
    this.s3Handlers = s3Handlers

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
  }

  addUpload(key: string, filePath: string, meta?: any) {
    const { extra, payload, type } = meta || { payload: {}, extra: {}, type: 'binary/octet-stream' }

    this.items[key] = {
      key,
      name: path.basename(key),
      filePath,
      meta,
      state: 'uploading',
    }
    setImmediate(async () => {
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
        this.items[key].uploadId = await Upload.startUpload(options)
      } catch (e) {
        console.error(e)
      }

      // @ts-ignore
      Upload.addListener('progress', this.uploads[key].uploadId, (data) => {
        this.items[key].progress = data.progress
        this.notify(key, 'progress', this.items[key])
      })

      // @ts-ignore
      Upload.addListener('error', this.uploads[key].uploadId, (err) => {
        this.items[key].error = err

        this.notify(key, 'error', this.items[key])
      })

      // @ts-ignore
      Upload.addListener('completed', this.uploads[key].uploadId, async (res: any) => {
        this.items[key].response = res

        const localPath = this.localPath(this.items[key].key)

        await RNFS.mkdir(path.dirname(localPath))
        await RNFS.moveFile(this.items[key].filePath!, localPath)

        const stats = await RNFS.stat(localPath)

        this.items[key].filePath = path
        this.items[key].state = 'local'
        this.items[key].progress = undefined
        this.items[key].meta.size = stats.size

        return this.notify(key, 'uploaded', this.items[key])
      })

      // @ts-ignore
      Upload.addListener('cancelled', this.uploads[key].uploadId, () => {
        const data: S3Item = { ...this.items[key] }
        delete this.items[key]
        this.notify(key, 'remove', data)
      })
    })
  }

  addDownload(key: string) {
    const filePath = this.localPath(key)
    this.items[key].state = 'downloading'

    setImmediate(async () => {
      await RNFS.mkdir(path.dirname(filePath))

      const { jobId, promise: downloader } = RNFS.downloadFile({
        fromUrl: `${this.items[key].uri}`,
        toFile: filePath,
        cacheable: false,
        background: true,
        discretionary: false,
        begin: () => {
          this.items[key].progress = 0
          this.notify(key, 'add', this.items[key])
        },
        progress: (p) => {
          this.items[key].progress = (p.bytesWritten * 100) / p.contentLength
          this.notify(key, 'progress', this.items[key])
        },
      })
      this.items[key].downloadId = `${jobId}`

      try {
        this.items[key].response = await downloader

        this.items[key].filePath = filePath
        this.items[key].existsLocally = true
        this.items[key].progress = undefined
        this.items[key].state = 'local'
      } catch (e) {
        console.error(e)
        const { uri, meta } = await this.s3Handlers.get(key)

        this.items[key].error = e
        this.items[key].uri = uri
        this.items[key].meta = meta || this.items[key].meta
      }

      return this.notify(key, this.items[key].error ? 'error' : 'downloaded', this.items[key]).then(() => {
        if (this.items[key].error) {
          this.addDownload(key)
        }
      })
    })
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

  list(prefix: string, reload = false) {
    setImmediate(async () => {
      if (!reload) {
        return
      }
      const remotes = await this.s3Handlers.list(prefix)

      for (const remote of remotes) {
        let item: S3Item
        if (this.items.hasOwnProperty(remote.key)) {
          this.items[remote.key].meta = remote.meta
          this.items[remote.key].uri = remote.url
          item = this.items[remote.key]
        } else if (this.items.hasOwnProperty(prefix)) {
          this.items[prefix].meta = remote.meta
          this.items[prefix].uri = remote.url
          item = this.items[prefix]
        } else {
          item = {
            key: path.join(prefix, remote.key),
            name: remote.key,
            meta: remote.meta,
            uri: remote.url,
            state: 'remote',
          }
        }

        if (await this.existsLocal(item.key)) {
          item.existsLocally = true
          item.filePath = this.localPath(item.key)
          item.state = 'local'
        }

        this.items[item.key] = item
      }

      this.notify(prefix, 'all').catch((e) => console.error(e))
    })

    return Object.values(this.items).filter((i) => {
      return i.key.startsWith(prefix)
    })
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
