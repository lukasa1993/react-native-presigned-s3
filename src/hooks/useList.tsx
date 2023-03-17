import { useCallback } from 'react'
import { useS3Client } from '../contexts/PS3Context'

export function useList() {
  const s3Client = useS3Client()

  const removeFile = useCallback(
    (key: string) => {
      return s3Client.remove(key)
    },
    [s3Client]
  )

  return {
    removeFile,
  }
}
