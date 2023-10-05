import { ListenerCB, notifyTypes, S3ClientConfig, S3Handlers, S3Item, S3ItemStorage } from '../types'
import PQueue from 'p-queue'
import { cancelUpload, uploadHandler } from '../helper/uploader'
import { cancelDownload, downloadHandler } from '../helper/downloader'
import { baseName, confirmHash, existsLocal, localPath, makeDir, pathJoin, removeFile } from '../helper/fs'
import { restore, store } from '../helper/persistor'
import InternalListener from '../helper/listener'

export const defaultConfig: S3ClientConfig = {
  directory: 'ps3_dl',
  immediateDownload: true,
  autoRemove: false,
  appGroup: '_app_group_needed_',
  retries: 5,
  persistKey: '@p3_storage_key',
  shouldPersist: true,
}

export class S3Client {
  protected listeners: any
  protected listenersIndex: any
  protected items: S3ItemStorage
  protected s3Handlers: S3Handlers
  protected config: S3ClientConfig
  protected queue: PQueue
  protected listQueue: PQueue

  protected internalListener: InternalListener

  constructor(s3Handlers: S3Handlers, config: S3ClientConfig = defaultConfig) {
    this.listenersIndex = {}
    this.listeners = {}
    this.items = {}

    this.internalListener = new InternalListener({
      notify: this.notify.bind(this),
      config,
      s3Handlers,
    })

    this.config = config
    this.s3Handlers = s3Handlers

    this.queue = new PQueue({
      concurrency: 10,
      autoStart: true,
      ...(this.config.queueConfig || {}),
    })
    this.listQueue = new PQueue({
      concurrency: 1,
      autoStart: true,
    })
    setImmediate(this.init.bind(this))
  }

  async validateConfig() {
    if (this.config.appGroup === '_app_group_needed_') {
      console.error('App Group Needed Please provide')
      process.exit(-1)
    }

    let localDirPath = localPath('', this.config.directory)
    try {
      await makeDir(localDirPath)
    } catch (e) {
      console.error("Couldn't create local directory", localDirPath, e)
      process.exit(-1)
    }

    let items = this.items
    try {
      const restored = await restore(this.config)
      const folders: S3Item[] = []
      const files: S3Item[] = []
      for (const restoredKey in restored) {
        const item: S3Item = restored[restoredKey]

        if (item.meta?.isFolder) {
          folders.push(item)
        } else {
          files.push(item)
        }
      }

      for (const folder of folders) {
        this.items[folder.key] = folder
      }

      for (const file of files) {
        this.items[file.key] = file
      }
    } catch (_) {}

    if (!this.items) {
      this.items = items
    } else {
      this.items = {
        ...this.items,
        ...items,
      }
    }
  }

  async init() {
    await this.validateConfig()
  }

  addUpload(key: string, filePath: string, meta?: any) {
    if (!this.items.hasOwnProperty(key)) {
      this.items[key] = {
        key,
        name: baseName(key),
        filePath,
        meta,
        retries: this.config.retries,
        state: 'uploading',
      }
    } else if (this.items[key].uploadId) {
      return
    }

    this.queue
      .add(async () => {
        await store(this.items, this.config)
        return uploadHandler({
          system: {
            s3Handlers: this.s3Handlers,
            config: this.config,
            internalListener: this.internalListener,
          },
          item: this.items[key],
        })
      })
      .catch((e) => {
        console.error('upload handler error', e)
        this.items[key].error = e
        this.notify(key, 'error', this.items[key])
      })
  }

  addDownload(key: string) {
    if (this.items[key].downloadId) {
      return
    }
    this.items[key].state = 'downloading'

    this.queue
      .add(async () => {
        await store(this.items, this.config)
        return downloadHandler({
          system: {
            config: this.config,
            s3Handlers: this.s3Handlers,
            internalListener: this.internalListener,
          },
          item: this.items[key],
        })
      })
      .catch((e) => {
        this.items[key].error = e
        this.notify(key, 'error', this.items[key])
      })
  }

  remove(key: string) {
    setImmediate(async () => {
      try {
        await cancelDownload(`${this.items[key].downloadId}`)
      } catch (_) {}
      try {
        await cancelUpload(`${this.items[key].uploadId}`)
      } catch (_) {}
      try {
        await this.s3Handlers.remove(key)
        await removeFile(key, this.config.directory)
      } catch (_) {}
      delete this.items[key]
      this.notify(key, 'remove')
    })
  }

  cancel(key: string) {
    const item = this.items[key]

    if (item.state === 'uploading' && item.uploadId) {
      cancelUpload(item.uploadId!)
      delete this.items[key]
      this.notify(key, 'remove')
    } else if (item.state === 'downloading' && item.downloadId) {
      cancelDownload(item.downloadId!)
      delete this.items[key]
      this.notify(key, 'remove')
    }
  }

  list(prefix: string, reload = false) {
    this.listQueue
      .add(async () => {
        if (!reload) {
          return
        }
        const remotes = await this.s3Handlers.list(prefix)

        let existingFiles = new Set()
        for (const remote of remotes) {
          let item: S3Item = this.items[remote.Key] || {
            key: remote.Key || pathJoin(prefix, remote.key),
            name: remote.meta?.name || baseName(remote.Key || remote.key),
            retries: this.config.retries,
            meta: remote.meta,
            uri: remote.url,
            state: 'remote',
          }

          existingFiles.add(item.key)

          if (!item.meta?.isFolder && (await existsLocal(item.key, this.config.directory))) {
            let hash = ''
            if (remote?.meta?.hash) {
              hash = remote.meta.hash
            } else {
              try {
                const { meta } = await this.s3Handlers.get(item.key)
                hash = `${meta.hash}`
              } catch (_) {}
            }
            item.existsLocally = await confirmHash(item.key, this.config.directory, hash)
            item.filePath = localPath(item.key, this.config.directory)
            item.state = 'local'
            if (!item.existsLocally) {
              try {
                await removeFile(item.key, this.config.directory)
              } catch (_) {}
              item.state = 'remote'
            }
          }

          this.items[item.key] = item
          if (!item.meta?.isFolder && !item.existsLocally && this.config.immediateDownload) {
            this.addDownload(item.key)
          }
        }

        let removedKeys = []
        for (const itemsKey in this.items) {
          if (itemsKey.startsWith(prefix) && !existingFiles.has(itemsKey)) {
            removedKeys.push(itemsKey)
          }
        }

        for (const removedKey of removedKeys) {
          if (this.items[removedKey].existsLocally && this.config.autoRemove) {
            this.remove(removedKey)
          }
        }

        await store(this.items, this.config)
        this.notify(prefix, 'all')
      })
      .catch((e) => console.error('error on list enqueue', e))

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

  handleError(key: string) {
    if (this.items[key].retries > 0) {
      this.items[key].retries--

      if (this.items[key].state === 'uploading') {
        this.items[key].uploadId = undefined
        this.addUpload(key, this.items[key].filePath!, this.items[key].meta)
      } else if (this.items[key].state === 'downloading') {
        this.items[key].downloadId = undefined
        this.addDownload(key)
      }
    }
  }

  notify(key: string, type: notifyTypes, item?: S3Item) {
    if (item) {
      this.items[key] = item
    }
    if (type === 'remove') {
      delete this.items[key]
    } else if (type === 'error') {
      this.handleError(key)
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
