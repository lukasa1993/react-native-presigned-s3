import { useCallback, useEffect, useState } from 'react'
import { useS3Client } from '../contexts/PS3Context'
import { S3Item, useListParams } from '../types'

export function useList(path: string, params: useListParams = { progress: false }) {
  const s3Client = useS3Client()

  const [files, setFiles] = useState<S3Item[]>(s3Client.list(path))
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState<any[]>([])

  const reload = useCallback(() => {
    setLoading(true)
    s3Client.list(path, true)
  }, [path, s3Client])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const lid = s3Client.addListener(path, (_key, type, list) => {
      setLoading(false)
      if (type === 'error') {
        let errors = []
        for (const s3Item of list) {
          errors.push(s3Item.error)
          if (s3Item.key === _key) {
            params.onError?.(s3Item.key, s3Item.error, false)
          }
        }
        setError(errors)
      } else if (type === 'progress') {
        if (params.progress) {
          setFiles(list)
        }
      } else {
        setFiles(list)

        if (type === 'uploaded') {
          params.onUploaded?.(_key)
        } else if (type === 'downloaded') {
          params.onDownloaded?.(_key)
        } else if (type === 'fatal') {
          params.onError?.(
            _key,
            list.find((s) => s.key === _key),
            true
          )
        }
      }
    })

    return () => {
      s3Client.removeListener(lid)
    }
  }, [path, params.progress, s3Client])

  const removeFile = useCallback(
    (key: string) => {
      return s3Client.remove(key)
    },
    [s3Client]
  )
  const addUpload = useCallback(
    (key: string, filePath: string, meta: any) => {
      return s3Client.addUpload(key, filePath, meta)
    },
    [s3Client]
  )
  const addDownload = useCallback(
    (key: string) => {
      return s3Client.addDownload(key)
    },
    [s3Client]
  )

  return {
    files,
    error,
    loading,
    reload,
    removeFile,
    addUpload,
    addDownload,
  }
}
