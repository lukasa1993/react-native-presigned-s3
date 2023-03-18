export type S3Handlers = {
  create: (payload: any, ...params: any) => Promise<any>
  list: (prefix: string, ...params: any) => Promise<any>
  remove: (key: string, ...params: any) => Promise<any>
  get: (key: string, ...params: any) => Promise<any>
}

export type S3ClientConfig = {
  directory: string
  immediateDownload: boolean
  appGroup: string
  localCache: boolean
}

export type S3Item = {
  state: 'uploading' | 'downloading' | 'local' | 'remote'
  key: string
  name: string
  meta: any
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

export type notifyTypes = 'progress' | 'downloaded' | 'uploaded' | 'remove' | 'add' | 'error' | 'all'
export type ListenerCB = (key: string, type: Partial<notifyTypes>, list: S3Item[]) => void
export type notifyCB = (key: string, type: notifyTypes, item?: S3Item) => void

export type useListParams = {
  progress: boolean
}
