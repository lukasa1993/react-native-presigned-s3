import RNFS from 'react-native-fs'

const folder = RNFS.CachesDirectoryPath
const prefix = 'ps3_'
export default async function HashGrab(key: string, meta: any) {
  let fileGrab: any = {}
  try {
    // fileGrab = await get(key, true);
  } catch (e) {
    console.log('HashGrab_Get', e)
  }

  const { uri, url, meta: { mime, hash } = {} as any } = fileGrab || ({} as any)
  const _uri = uri || url
  if (!_uri || !hash) {
    console.log('not found', key, _uri)
    throw new Error('not found')
  }
  const extension = mime?.split('/')[1]
  const cachePath = `${folder}/${prefix}${hash}.${extension}`

  try {
    const exists = await RNFS?.exists(cachePath)
    if (!exists) {
      await RNFS.downloadFile({
        fromUrl: _uri,
        toFile: cachePath,
        cacheable: false,
        background: false,
        discretionary: false,
      }).promise
    }
  } catch (e) {
    console.log('HashGrab_download', e)
  }

  if (meta === true) {
    return {
      uri: _uri,
      cache: cachePath,
      mime,
      hash,
    }
  }

  return cachePath
}
