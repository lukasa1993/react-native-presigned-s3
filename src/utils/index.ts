import React, { useRef } from 'react'

export const useAsync = (fn: any) => {
  const initialState = { loading: false, error: null, value: null }
  const stateReducer = (_: any, action: any) => {
    switch (action.type) {
      case 'start':
        return { loading: true, error: null, value: null }
      case 'finish':
        return { loading: false, error: null, value: action.value }
      case 'error':
        return { loading: false, error: action.error, value: null }
      default:
        throw new Error('dead')
    }
  }

  const [state, dispatch] = React.useReducer(stateReducer, initialState)

  const run = useRef(async (args = null) => {
    try {
      dispatch({ type: 'start' })
      const value = await fn(args)
      dispatch({ type: 'finish', value })
    } catch (error) {
      dispatch({ type: 'error', error })
    }
  })

  return { ...state, run: run.current }
}
