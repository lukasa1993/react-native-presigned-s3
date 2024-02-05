import { Options, QueueAddOptions } from 'p-queue'
import PriorityQueue from 'p-queue/dist/priority-queue'

export type S3Handlers = {
  create: (payload: any, ...params: any) => Promise<{ fields: { [key: string]: string }; url: string }>
  list: (
    prefix: string,
    ...params: any
  ) => Promise<{ key: string; Key: string; meta: { hash?: string; isFolder?: boolean; name?: string }; url: string }[]>
  remove: (key: string, ...params: any) => Promise<void>
  get: (key: string, ...params: any) => Promise<{ uri: string; meta: { hash: string } }>
}

export type S3ClientConfig = {
  directory: string
  immediateDownload: boolean
  autoRemove: boolean
  appGroup: string
  retries: number
  persistKey: string
  shouldPersist: boolean
  queueConfig?: Options<PriorityQueue, QueueAddOptions>
}

export type S3Item = {
  state: 'uploading' | 'downloading' | 'local' | 'remote'
  key: string
  name: string
  meta: any
  retries: number
  uri?: string
  filePath?: string
  existsLocally?: boolean
  progress?: number
  response?: any
  error?: any
  uploadId?: string
  downloadId?: string
}

export type S3ItemStorage = {
  [key: string]: S3Item
}

export type notifyTypes = 'progress' | 'downloaded' | 'uploaded' | 'remove' | 'add' | 'error' | 'fatal' | 'all'
export type ListenerCB = (key: string, type: Partial<notifyTypes>, list: S3Item[]) => void
export type notifyCB = (key: string, type: notifyTypes, item?: S3Item) => void

export type useListParams = {
  progress: boolean
  onUploaded?: (key: string) => void
  onDownloaded?: (key: string) => void
  onError?: (key: string, error: unknown, fata: boolean) => void
}

export type directListeners = {
  onUploaded?: (key: string) => void
  onDownloaded?: (key: string) => void
  onError?: (key: string, error: unknown, fata: boolean) => void
}
