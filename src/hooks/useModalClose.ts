import { useCallback, useState } from 'react'

const CLOSE_DURATION_MS = 180

/**
 * Delays a modal's actual unmount so its scale/fade-out transition can play.
 * Call `requestClose()` instead of `onClose()` directly from close buttons,
 * backdrop clicks, and Escape handlers. `closing` drives the exit styles.
 */
export function useModalClose(onClose: () => void) {
  const [closing, setClosing] = useState(false)

  const requestClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, CLOSE_DURATION_MS)
  }, [closing, onClose])

  return { closing, requestClose }
}
