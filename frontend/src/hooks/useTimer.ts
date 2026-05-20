import { useCallback, useEffect, useRef, useState } from 'react'

interface TimerOptions {
  onExpire?: () => void
}

interface TimerFormatted {
  hours: string
  minutes: string
  seconds: string
}

interface TimerReturn {
  timeLeft: number
  isRunning: boolean
  start: (seconds?: number) => void
  pause: () => void
  reset: (seconds?: number) => void
  formatted: TimerFormatted
}

function formatPart(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0')
}

export function useTimer(initialSeconds: number, options?: TimerOptions): TimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)

  const endTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const initialRef = useRef(initialSeconds)
  const onExpireRef = useRef(options?.onExpire)

  // Keep onExpire ref up to date without re-triggering effects
  useEffect(() => {
    onExpireRef.current = options?.onExpire
  }, [options?.onExpire])

  const tick = useCallback(() => {
    if (endTimeRef.current === null) return

    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
    setTimeLeft(remaining)

    if (remaining <= 0) {
      setIsRunning(false)
      endTimeRef.current = null
      onExpireRef.current?.()
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(
    (seconds?: number) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      const duration = seconds !== undefined ? seconds : initialRef.current
      endTimeRef.current = Date.now() + duration * 1000
      setTimeLeft(duration)
      setIsRunning(true)
      rafRef.current = requestAnimationFrame(tick)
    },
    [tick],
  )

  const pause = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    endTimeRef.current = null
    setIsRunning(false)
  }, [])

  const reset = useCallback((seconds?: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    endTimeRef.current = null
    const duration = seconds !== undefined ? seconds : initialRef.current
    initialRef.current = duration
    setTimeLeft(duration)
    setIsRunning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const totalSeconds = Math.max(0, timeLeft)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return {
    timeLeft,
    isRunning,
    start,
    pause,
    reset,
    formatted: {
      hours: formatPart(hours),
      minutes: formatPart(minutes),
      seconds: formatPart(seconds),
    },
  }
}
