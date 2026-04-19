import { useEffect, useState } from 'react'
import { checkWebGPU } from '../engine/checkWebGPU'

const initialState = {
  status: 'loading',
  adapterInfo: null,
}

export default function useWebGPU() {
  const [state, setState] = useState(initialState)

  useEffect(() => {
    let isMounted = true

    const detect = async () => {
      if (typeof navigator === 'undefined' || !navigator.gpu) {
        if (isMounted) {
          setState({ status: 'unsupported', adapterInfo: null })
        }
        return
      }

      try {
        const result = await checkWebGPU()
        if (!isMounted) {
          return
        }

        setState({
          status: result.supported ? 'supported' : 'unsupported',
          adapterInfo: result.adapterInfo,
        })
      } catch (error) {
        if (isMounted) {
          setState({ status: 'unsupported', adapterInfo: null })
        }
        console.warn('WebGPU detection hook failed:', error)
      }
    }

    detect()

    return () => {
      isMounted = false
    }
  }, [])

  return state
}
