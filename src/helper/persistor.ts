import { S3ClientConfig, S3ItemStorage } from '../types'
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function store(items: S3ItemStorage, config: S3ClientConfig) {
  const serialized = JSON.stringify(items)

  await AsyncStorage.setItem(config.persistKey, serialized)
}

export async function restore(config: S3ClientConfig): Promise<S3ItemStorage> {
  const serialized = await AsyncStorage.getItem(config.persistKey)
  return JSON.parse(serialized)
}
