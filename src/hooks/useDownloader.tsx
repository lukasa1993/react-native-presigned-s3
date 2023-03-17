import { useS3Client } from '../contexts/PS3Context'
import { useCallback, useEffect, useState } from 'react'

export function useDownloader(key: string) {
  const s3Client = useS3Client()

  const [localPath, setLocalPath] = useState<string | null>(null)

  const addDownload = useCallback(
    (dKey: string) => {
      return s3Client.addDownload(dKey)
    },
    [s3Client]
  )

  useEffect(() => {
    s3Client.existsLocal(key).then((has) => {
      setLocalPath(has ? s3Client.localPath(key) : null)
    })
  }, [key, s3Client])

  useEffect(() => {
    if (!key) {
      return () => null
    }
    const lid = s3Client.addListener(key, (_: string, { type, data }: { type: string; data: { type: string } }) => {
      if (type === 'completed' && data.type === 'downloading') {
        s3Client.existsLocal(key).then((has) => {
          setLocalPath(has ? s3Client.localPath(key) : null)
        })
      }
    })

    return () => {
      s3Client.removeListener(lid)
    }
  }, [key, s3Client])

  return {
    addDownload,
    exists: Boolean(localPath),
    localPath,
  }
}
