import Upload, { MultipartUploadOptions } from 'react-native-background-upload'
import { Platform } from 'react-native'
import { S3ClientConfig, S3Handlers, S3Item } from '../types'
import InternalListener from './listener'

export async function uploadHandler({
  system,
  item,
}: {
  system: { config: S3ClientConfig; s3Handlers: S3Handlers; internalListener: InternalListener }
  item: S3Item
}) {
  const { config, s3Handlers, internalListener } = system
  const key = item.key
  const { extra, payload, type } = item.meta || { payload: {}, extra: {}, type: 'binary/octet-stream' }

  const { fields, url } = await s3Handlers.create({ key, type: type })

  const options: MultipartUploadOptions = {
    url,
    path: Platform.OS === 'ios' ? `file://${item.filePath!}` : item.filePath!,
    method: 'POST',
    type: 'multipart',
    field: 'file',
    customUploadId: key,
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
    internalListener.uploadStarted(key, item)
  } catch (e) {
    console.error('create upload error', e)
  }

  // @ts-ignore
  Upload.addListener('progress', item.uploadId, internalListener.uploadProgress(key, item))

  // @ts-ignore
  Upload.addListener('error', item.uploadId, internalListener.uploadError(key, item))

  // @ts-ignore
  Upload.addListener('completed', item.uploadId, internalListener.uploadCompleted(key, item))

  Upload.addListener('cancelled', item.uploadId!, internalListener.uploadCancelled(key, item))
}

export async function cancelUpload(uploadID: string) {
  return Upload.cancelUpload(uploadID).catch((e) => console.error('cancel upload error', e))
}
