import { useCallback, useEffect, useState } from 'react'
import { useS3Client } from '../contexts/PS3Context'
import { S3Item, useListParams } from '../types'

export function useList(path: string, params: useListParams = { mountReload: true, progress: false }) {
  const s3Client = useS3Client()

  const [files, setFiles] = useState<S3Item[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(
    (r: boolean = true) => {
      setLoading(true)
      s3Client.list(path, r).catch((e) => console.log(e))
    },
    [path, s3Client]
  )

  useEffect(() => {
    reload(params.mountReload)
  }, [params.mountReload, reload])

  useEffect(() => {
    const lid = s3Client.addListener(path, (_key, type, list) => {
      setLoading(false)
      if (type === 'progress') {
        if (params.progress) {
          setFiles(list)
        }
      } else {
        setFiles(list)
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
    loading,
    reload,
    removeFile,
    addUpload,
    addDownload,
  }
}
