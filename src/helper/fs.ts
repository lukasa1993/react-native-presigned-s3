import RNFS from 'react-native-fs'
// @ts-ignore
import path from 'path-browserify'

export function localPath(key: string, directory: string): string {
  return `${RNFS.CachesDirectoryPath}/${directory}/${key}`
}

export function makeDir(dirPath: string) {
  return RNFS.mkdir(path.dirname(dirPath))
}

export async function moveFile(from: string, to: string) {
  try {
    return RNFS.moveFile(from, to)
  } catch (e) {
    await RNFS.unlink(to)
    return RNFS.moveFile(from, to)
  }
}

export function fileStats(filePath: string) {
  return RNFS.stat(filePath)
}

export function existsLocal(key: string, directory: string): Promise<boolean> {
  return RNFS.exists(localPath(key, directory))
}
export function removeFile(key: string, directory: string): Promise<void> {
  return RNFS.unlink(localPath(key, directory))
}

export function baseName(filePath: string): string {
  return path.basename(filePath)
}
export function dirname(filePath: string): string {
  return path.dirname(filePath)
}
export function pathJoin(...paths: string[]): string {
  return path.join(...paths)
}
export async function confirmHash(key: string, directory: string, hash: string): Promise<boolean> {
  try {
    const filePath = localPath(key, directory)
    const exists = await RNFS.exists(filePath)
    if (exists) {
      const fileHash = await RNFS.hash(filePath, 'md5')
      return hash.trim() === fileHash.trim()
    }
  } catch (_) {}
  return false
}
