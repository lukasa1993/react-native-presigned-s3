import { useCallback } from 'react'
import { useS3Client } from '../contexts/PS3Context'

export function useUploader() {
  const s3Client = useS3Client()

  const addUpload = useCallback(
    (key: string, filePath: string, meta?: any) => {
      return s3Client.addUpload(key, filePath, meta)
    },
    [s3Client]
  )

  return {
    addUpload,
  }
}
