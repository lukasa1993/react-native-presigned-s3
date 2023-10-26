import { notifyCB, S3ClientConfig, S3Handlers, S3Item } from '../types'
import { confirmHash, fileStats, localPath, makeDir, moveFile } from './fs'

export default class InternalListener {
  protected notify: notifyCB
  protected config: S3ClientConfig
  protected s3Handlers: S3Handlers

  protected listenerStorage: { uploads: any; downloads: any }

  constructor({ notify, config, s3Handlers }: { notify: notifyCB; config: S3ClientConfig; s3Handlers: S3Handlers }) {
    this.notify = notify
    this.config = config
    this.s3Handlers = s3Handlers

    this.listenerStorage = {
      uploads: {
        started: {},
        progress: {},
        error: {},
        completed: {},
        canceled: {},
      },
      downloads: {
        started: {},
        progress: {},
        error: {},
        completed: {},
        canceled: {},
      },
    }
  }

  private destroyUploadListeners(key: string) {
    try {
      delete this.listenerStorage.uploads.started[key]
    } catch (_) {}

    try {
      delete this.listenerStorage.uploads.error[key]
    } catch (_) {}
    try {
      delete this.listenerStorage.uploads.progress[key]
    } catch (_) {}
    try {
      delete this.listenerStorage.uploads.completed[key]
    } catch (_) {}
    try {
      delete this.listenerStorage.uploads.canceled[key]
    } catch (_) {}
  }
  private destroyDownloadListeners(key: string) {
    try {
      delete this.listenerStorage.downloads.started[key]
    } catch (_) {}

    try {
      delete this.listenerStorage.downloads.error[key]
    } catch (_) {}
    try {
      delete this.listenerStorage.downloads.progress[key]
    } catch (_) {}
    try {
      delete this.listenerStorage.downloads.completed[key]
    } catch (_) {}
    try {
      delete this.listenerStorage.downloads.canceled[key]
    } catch (_) {}
  }

  uploadStarted(key: string, item: S3Item) {
    this.notify(key, 'add', item)
  }
  uploadProgress(key: string, item: S3Item) {
    this.listenerStorage.uploads.progress[key] = (data: any) => {
      item.progress = data.progress
      this.notify(key, 'progress', item)
    }
    return this.listenerStorage.uploads.progress[key]
  }
  uploadError(key: string, item: S3Item) {
    this.listenerStorage.uploads.error[key] = (err: any) => {
      item.error = err

      this.notify(key, 'error', item)
    }
    return this.listenerStorage.uploads.error[key]
  }
  uploadCompleted(key: string, item: S3Item) {
    this.listenerStorage.uploads.completed[key] = async (res: any) => {
      item.response = res

      const _localPath = localPath(item.key, this.config.directory)

      await makeDir(_localPath)
      await moveFile(item.filePath!, _localPath)

      const stats = await fileStats(_localPath)

      const { uri, meta } = await this.s3Handlers.get(item.key)

      item.existsLocally = await confirmHash(item.key, this.config.directory, meta.hash)
      item.filePath = _localPath
      item.state = 'local'
      item.progress = undefined
      item.meta.size = stats.size
      item.uri = uri

      if (item.existsLocally) {
        this.notify(key, 'uploaded', item)
        this.destroyUploadListeners(key)
      } else {
        item.error = 'Hash Mismatch'
        if (item.retries < 1) {
          this.destroyUploadListeners(key)
        }
        this.notify(key, 'error', item)
      }
    }
    return this.listenerStorage.uploads.completed[key]
  }

  uploadCancelled(key: string, item: S3Item) {
    this.listenerStorage.uploads.canceled[key] = () => {
      this.notify(key, 'remove', item)
      this.destroyUploadListeners(key)
    }
    return this.listenerStorage.uploads.canceled[key]
  }

  downloadStarted(key: string, item: S3Item) {
    this.listenerStorage.downloads.started[key] = () => {
      item.progress = 0
      this.notify(key, 'add', item)
    }
    return this.listenerStorage.downloads.started[key]
  }
  downloadProgress(key: string, item: S3Item) {
    this.listenerStorage.downloads.progress[key] = (p: { bytesWritten: number; contentLength: number }) => {
      item.progress = (p.bytesWritten * 100) / p.contentLength
      this.notify(key, 'progress', item)
    }
    return this.listenerStorage.downloads.progress[key]
  }
  downloadCompleted(key: string, item: S3Item) {
    this.listenerStorage.downloads.completed[key] = () => {
      this.notify(key, 'downloaded', item)
      this.destroyDownloadListeners(key)
    }

    return this.listenerStorage.downloads.completed[key]
  }
  downloadError(key: string, item: S3Item) {
    this.listenerStorage.downloads.error[key] = () => {
      if (item.retries < 1) {
        this.destroyDownloadListeners(key)
      }
      this.notify(key, 'error', item)
    }

    return this.listenerStorage.downloads.error[key]
  }
}
