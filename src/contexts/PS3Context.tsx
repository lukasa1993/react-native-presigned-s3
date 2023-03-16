import React, { createContext } from 'react'
import { ViewProps } from 'react-native'
import { S3Client } from './S3Client'

export type PS3ContextType = {
  S3Client: S3Client
}

const PS3Context = createContext<PS3ContextType | undefined>(undefined)

export interface PS3ProviderProps extends ViewProps {
  children?: React.ReactNode
  S3Client: S3Client
}

export function PS3Provider({ children, S3Client }: PS3ProviderProps) {
  return <PS3Context.Provider value={{ S3Client }}>{children}</PS3Context.Provider>
}

export const PS3Consumer = PS3Context.Consumer

export default PS3Context

export const useS3Client = () => {
  const ctx = React.useContext(PS3Context)

  return ctx!.S3Client
}
