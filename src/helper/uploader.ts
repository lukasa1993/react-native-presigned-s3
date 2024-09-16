import { backgroundUpload, cancelUpload as uploaderCancel, UploadType } from 'react-native-compressor'
import { Platform } from 'react-native'
import { S3ClientConfig, S3Handlers, S3Item } from '../types'
import InternalListener from './listener'
import { UploaderOptions } from 'react-native-compressor/lib/typescript/utils'

export async function uploadHandler({
  system,
  item,
}: {
  system: { config: S3ClientConfig; s3Handlers: S3Handlers; internalListener: InternalListener }
  item: S3Item
}) {
  const { s3Handlers, internalListener } = system
  const key = item.key
  const { extra, payload, type } = item.meta || { payload: {}, extra: {}, type: 'binary/octet-stream' }

  const { fields, url } = await s3Handlers.create({ key, type: type })

  const options: UploaderOptions = {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      ...fields,
      'x-amz-meta-json': JSON.stringify(payload),
      ...extra,
      'Content-Type': type,
    },
    headers: {
      // 'Content-Type': type,
    },
    mimeType: type,
    getCancellationId: (cancellationId) => (item.uploadId = cancellationId),
  }

  try {
    const uploadRes = backgroundUpload(
      url,
      Platform.OS === 'ios' ? `file://${item.filePath!}` : item.filePath!,
      options,
      (written, total) => {
        internalListener.uploadProgress(key, item)({ progress: (written * 100) / total })
      }
    )
    internalListener.uploadStarted(key, item)
    const uploadResult = await uploadRes
    if (uploadResult.status >= 400) {
      internalListener.uploadError(key, item)(uploadResult)
    } else {
      internalListener.uploadCompleted(key, item)(uploadResult)
    }
  } catch (e) {
    console.error('create upload error', JSON.stringify(e))
    internalListener.uploadError(key, item)(e)
  }
}

export function cancelUpload(uploadID: string) {
  console.log(`upload canceled: `, uploadID)
  uploaderCancel(uploadID)
}
