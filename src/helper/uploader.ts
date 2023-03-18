import Upload, { MultipartUploadOptions } from 'react-native-background-upload'
import { Platform } from 'react-native'
import { notifyCB, S3ClientConfig, S3Handlers, S3Item } from '../types'
import { confirmHash, fileStats, localPath, makeDir, moveFile } from './fs'

export async function uploadHandler({
  system,
  item,
}: {
  system: { config: S3ClientConfig; s3Handlers: S3Handlers; notify: notifyCB }
  item: S3Item
}) {
  const { config, s3Handlers, notify } = system
  const key = item.key
  const { extra, payload, type } = item.meta || { payload: {}, extra: {}, type: 'binary/octet-stream' }

  const { fields, url } = await s3Handlers.create({ key, type: type })

  const options: MultipartUploadOptions = {
    url,
    path: Platform.OS === 'ios' ? `file://${item.filePath!}` : item.filePath!,
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
    appGroup: config.appGroup,
  }

  try {
    item.uploadId = await Upload.startUpload(options)
    notify(key, 'add', item)
  } catch (e) {
    console.error('create upload error', e)
  }

  // @ts-ignore
  Upload.addListener('progress', item.uploadId, (data) => {
    item.progress = data.progress
    notify(key, 'progress', item)
  })

  // @ts-ignore
  Upload.addListener('error', item.uploadId, (err) => {
    item.error = err

    notify(key, 'error', item)
  })

  // @ts-ignore
  Upload.addListener('completed', item.uploadId, async (res: any) => {
    item.response = res

    const _localPath = localPath(item.key, config.directory)

    await makeDir(_localPath)
    await moveFile(item.filePath!, _localPath)

    const stats = await fileStats(_localPath)

    const { meta } = await s3Handlers.get(item.key)

    item.existsLocally = await confirmHash(item.key, config.directory, meta.hash)
    item.filePath = _localPath
    item.state = 'local'
    item.progress = undefined
    item.meta.size = stats.size

    if (item.existsLocally) {
      notify(key, 'uploaded', item)
    } else {
      item.error = 'Hash Mismatch'
      notify(key, 'error', item)
    }
  })

  Upload.addListener('cancelled', item.uploadId!, () => {
    notify(key, 'remove', item)
  })
}

export function cancelUpload(uploadID: string) {
  Upload.cancelUpload(uploadID).catch((e) => console.error('cancel upload error', e))
}
