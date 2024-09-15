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

export async function removeFolder(directory: string) {
  try {
    const folderPath = `${RNFS.CachesDirectoryPath}/${directory}`
    // Check if the folder exists
    const exists = await RNFS.exists(folderPath)

    if (!exists) {
      console.log('Folder does not exist:', folderPath)
      return
    }

    // Get the contents of the folder
    const items = await RNFS.readDir(folderPath)

    // Loop through the contents and delete files and folders recursively
    for (const item of items) {
      if (item.isDirectory()) {
        // Recursively delete sub-folders
        await removeFolder(item.path.replace(`${RNFS.CachesDirectoryPath}/`, ''))
      } else {
        // Delete file
        await RNFS.unlink(item.path)
      }
    }

    // Finally, delete the folder itself
    await RNFS.unlink(folderPath)
    console.log(`Folder deleted successfully: ${folderPath}`)
  } catch (error) {
    console.error('Error while deleting folder:', error)
  }
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
