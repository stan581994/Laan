import { useCallback, useEffect, useRef, useState } from 'react'
import { api, Session, StartSessionData } from '../api/client'

export type SessionState = 'idle' | 'active' | 'on_break' | 'completed'

interface UseSessionReturn {
  state: SessionState
  session: Session | null
  newlyUnlocked: string[]
  error: string | null
  isAlarmPlaying: boolean
  start: (data: StartSessionData) => Promise<void>
  takeBreak: () => Promise<void>
  breakEnded: () => void
  end: () => Promise<void>
  abandon: () => Promise<void>
  reset: () => void
  playAlarm: () => void
  stopAlarm: () => void
  primeAlarm: () => void
}

export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>('idle')
  const [session, setSession] = useState<Session | null>(null)
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false)

  const alarmRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio('/alarm.mp3')
    audio.addEventListener('ended', () => setIsAlarmPlaying(false))
    alarmRef.current = audio
    return () => audio.removeEventListener('ended', () => setIsAlarmPlaying(false))
  }, [])

  const playAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.currentTime = 0
      alarmRef.current.play().catch(() => {})
      setIsAlarmPlaying(true)
    }
  }, [])

  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.pause()
      alarmRef.current.currentTime = 0
    }
    setIsAlarmPlaying(false)
  }, [])

  // Call this on the Start button click to unlock audio for later programmatic plays
  const primeAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.play()
        .then(() => {
          alarmRef.current!.pause()
          alarmRef.current!.currentTime = 0
        })
        .catch(() => {})
    }
  }, [])

  // On mount: check for an active session
  useEffect(() => {
    api
      .getActiveSession()
      .then((active) => {
        if (active) {
          setSession(active)
          setState('active')
        }
      })
      .catch(() => {
        // Backend might not be running yet — stay idle
      })
  }, [])

  const start = useCallback(async (data: StartSessionData) => {
    setError(null)
    try {
      const created = await api.startSession(data)
      setSession(created)
      setState('active')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    }
  }, [])

  const takeBreak = useCallback(async () => {
    if (!session) return
    setError(null)
    try {
      const updated = await api.useBreak(session.id)
      setSession(updated)
      setState('on_break')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take break')
    }
  }, [session])

  const breakEnded = useCallback(() => {
    setState('active')
    playAlarm()
  }, [playAlarm])

  const end = useCallback(async () => {
    if (!session) return
    setError(null)
    try {
      const { session: ended, newly_unlocked } = await api.endSession(session.id)
      setSession(ended)
      setNewlyUnlocked(newly_unlocked)
      setState('completed')
      playAlarm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
    }
  }, [session, playAlarm])

  const abandon = useCallback(async () => {
    if (!session) return
    setError(null)
    try {
      await api.abandonSession(session.id)
      setSession(null)
      setState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to abandon session')
    }
  }, [session])

  const reset = useCallback(() => {
    setState('idle')
    setSession(null)
    setNewlyUnlocked([])
    setError(null)
  }, [])

  return { state, session, newlyUnlocked, error, isAlarmPlaying, start, takeBreak, breakEnded, end, abandon, reset, playAlarm, stopAlarm, primeAlarm }
}
