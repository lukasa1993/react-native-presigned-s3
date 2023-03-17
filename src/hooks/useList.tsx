import { useCallback, useEffect, useState } from 'react'
import { useS3Client } from '../contexts/PS3Context'
import { useAsync } from '../utils'

export function useList(path?: string) {
  const s3Client = useS3Client()

  const { value, run, loading } = useAsync(() => (path ? s3Client.list(path) : []))
  const files = value || []
  const [{ downloads, uploads }, setActiveList] = useState(
    path ? s3Client.activeList(path) : { downloads: [], uploads: [] }
  )

  useEffect(() => {
    if (path) {
      run().catch((e) => console.error(e))
    }
  }, [path, run])

  useEffect(() => {
    if (!path) {
      return () => null
    }
    const lid = s3Client.addListener(path, (_: string, { type, data }: { type: string; data: { type: string } }) => {
      if ((type === 'completed' && data.type === 'uploading') || type === 'removed') {
        run().catch((e) => console.error(e))
      }
      setActiveList(s3Client.activeList(path))
    })

    return () => {
      s3Client.removeListener(lid)
    }
  }, [path, run, s3Client])

  const removeFile = useCallback(
    (key: string) => {
      return s3Client.remove(key)
    },
    [s3Client]
  )

  return {
    files,
    downloads,
    uploads,
    reload: run,
    loading,
    removeFile,
  }
}
