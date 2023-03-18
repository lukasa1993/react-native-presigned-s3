import RNFS from 'react-native-fs'
import { notifyCB, S3ClientConfig, S3Handlers, S3Item } from '../types'
import { confirmHash, localPath, makeDir } from './fs'

export async function downloadHandler({
  system,
  item,
}: {
  system: { config: S3ClientConfig; s3Handlers: S3Handlers; notify: notifyCB }
  item: S3Item
}) {
  const { config, s3Handlers, notify } = system
  const key = item.key
  const filePath = localPath(key, config.directory)
  await makeDir(filePath)

  const { jobId, promise: downloader } = RNFS.downloadFile({
    fromUrl: `${item.uri}`,
    toFile: filePath,
    cacheable: false,
    background: true,
    discretionary: false,
    begin: () => {
      item.progress = 0
      notify(key, 'add', item)
    },
    progress: (p) => {
      item.progress = (p.bytesWritten * 100) / p.contentLength
      notify(key, 'progress', item)
    },
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
  } catch (e) {
    console.error(e)
    const { uri, meta } = await s3Handlers.get(key)

    item.error = e
    item.uri = uri
    item.meta = meta || item.meta
  }

  notify(key, item.error ? 'error' : 'downloaded', item)
}

export function cancelDownload(downloadID: string) {
  return RNFS.stopDownload(Number(downloadID))
}
