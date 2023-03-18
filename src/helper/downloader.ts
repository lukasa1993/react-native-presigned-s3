import RNFS from 'react-native-fs'
import { S3ClientConfig, S3Handlers, S3Item } from '../types'
import { confirmHash, localPath, makeDir } from './fs'
import InternalListener from './listener'

export async function downloadHandler({
  system,
  item,
}: {
  system: { config: S3ClientConfig; s3Handlers: S3Handlers; internalListener: InternalListener }
  item: S3Item
}) {
  const { config, s3Handlers, internalListener } = system
  const key = item.key
  const filePath = localPath(key, config.directory)
  await makeDir(filePath)

  const { jobId, promise: downloader } = RNFS.downloadFile({
    fromUrl: `${item.uri}`,
    toFile: filePath,
    cacheable: false,
    background: true,
    discretionary: false,
    begin: internalListener.downloadStarted(key, item),
    progress: internalListener.downloadProgress(key, item),
  })
  item.downloadId = `${jobId}`

  try {
    item.response = await downloader

    let hash = ''
    if (item.meta?.hash) {
      hash = item.meta.hash
    } else {
      try {
        const { meta } = await s3Handlers.get(item.key)
        hash = `${meta.hash}`
      } catch (_) {}
    }
    item.existsLocally = await confirmHash(item.key, config.directory, hash)

    item.filePath = filePath
    item.progress = undefined
    item.state = 'local'
    internalListener.downloadCompleted(key, item)()
  } catch (e) {
    console.error(e)
    const { uri, meta } = await s3Handlers.get(key)

    item.error = e
    item.uri = uri
    item.meta = meta || item.meta

    internalListener.downloadError(key, item)()
  }
}

export function cancelDownload(downloadID: string) {
  return RNFS.stopDownload(parseInt(downloadID) > 0 ? parseInt(downloadID) : -1)
}
