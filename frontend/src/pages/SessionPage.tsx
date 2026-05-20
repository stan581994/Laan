import { useCallback, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENTS_META } from '../api/client'
import { useSession } from '../hooks/useSession'
import { useTimer } from '../hooks/useTimer'

const BREAK_DURATION_SECONDS = 300 // 5 minutes

function calcBreaksBudget(totalMinutes: number): number {
  return Math.ceil(totalMinutes / 40)
}

// ─────────────────────────── Idle / start form ───────────────────────────────

interface StartFormProps {
  onStart: (taskName: string, description: string, hours: number, minutes: number, seconds: number) => void
  error: string | null
}

function StartForm({ onStart, error }: StartFormProps) {
  const [taskName, setTaskName] = useState('')
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(25)
  const [seconds, setSeconds] = useState(0)

  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  const totalMinutes = totalSeconds / 60
  const breaksBudget = totalMinutes > 0 ? calcBreaksBudget(totalMinutes) : 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!taskName.trim() || totalSeconds < 10) return
    onStart(taskName.trim(), description.trim(), hours, minutes, seconds)
  }

  return (
    <div className="flex items-center justify-center min-h-full px-8 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg flex flex-col gap-6"
      >
        <h1
          className="text-3xl font-semibold text-center"
          style={{ color: '#F5E6CC' }}
        >
          What are you dedicating to?
        </h1>

        {error && (
          <p className="text-sm text-center px-3 py-2 rounded" style={{ color: '#F5E6CC', background: '#8B3030' }}>
            {error}
          </p>
        )}

        <input
          type="text"
          placeholder="Task name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg text-xl outline-none border focus:border-[#D4A017] transition-colors"
          style={{
            background: '#1a1008',
            border: '1px solid #3d2515',
            color: '#F5E6CC',
          }}
        />

        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg text-base outline-none border focus:border-[#D4A017] transition-colors resize-none"
          style={{
            background: '#1a1008',
            border: '1px solid #3d2515',
            color: '#F5E6CC',
          }}
        />

        {/* Duration picker */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color: '#A08060' }}>
            Duration
          </label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-3 py-2 rounded text-center text-lg outline-none border focus:border-[#D4A017] transition-colors"
                style={{
                  background: '#1a1008',
                  border: '1px solid #3d2515',
                  color: '#F5E6CC',
                }}
              />
              <span style={{ color: '#A08060' }}>hr</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-3 py-2 rounded text-center text-lg outline-none border focus:border-[#D4A017] transition-colors"
                style={{
                  background: '#1a1008',
                  border: '1px solid #3d2515',
                  color: '#F5E6CC',
                }}
              />
              <span style={{ color: '#A08060' }}>min</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={59}
                value={seconds}
                onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 px-3 py-2 rounded text-center text-lg outline-none border focus:border-[#D4A017] transition-colors"
                style={{
                  background: '#1a1008',
                  border: '1px solid #3d2515',
                  color: '#F5E6CC',
                }}
              />
              <span style={{ color: '#A08060' }}>sec</span>
            </div>
          </div>
        </div>

        {totalSeconds > 0 && (
          <p className="text-sm" style={{ color: '#A08060' }}>
            You'll have{' '}
            <span style={{ color: '#D4A017' }}>{breaksBudget}</span>{' '}
            {breaksBudget === 1 ? 'break' : 'breaks'} available
          </p>
        )}

        <button
          type="submit"
          disabled={!taskName.trim() || totalSeconds < 10}
          className="w-full py-4 rounded-lg text-lg font-semibold transition-opacity disabled:opacity-40"
          style={{ background: '#D4A017', color: '#0f0a05' }}
        >
          Start Focus
        </button>
      </form>
    </div>
  )
}

// ─────────────────────────── Break dots ──────────────────────────────────────

function BreakDots({ total, used }: { total: number; used: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="text-xl"
          style={{ color: i < used ? '#A08060' : '#D4A017' }}
        >
          {i < used ? '●' : '○'}
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────── Active timer view ───────────────────────────────

interface ActiveViewProps {
  session: import('../api/client').Session
  formatted: { hours: string; minutes: string; seconds: string }
  timedOut: boolean
  isAlarmPlaying: boolean
  onTakeBreak: () => void
  onEnd: () => void
  onAbandon: () => void
  onStopAlarm: () => void
  error: string | null
}

function ActiveView({ session, formatted, timedOut, isAlarmPlaying, onTakeBreak, onEnd, onAbandon, onStopAlarm, error }: ActiveViewProps) {
  const [abandonConfirm, setAbandonConfirm] = useState(false)
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const plannedSeconds = session.planned_duration_minutes * 60
  // Derive elapsed from the session start time for the progress bar
  const startedAt = new Date(session.started_at).getTime()
  const elapsedSeconds = Math.min((Date.now() - startedAt) / 1000, plannedSeconds)
  const progress = plannedSeconds > 0 ? (elapsedSeconds / plannedSeconds) * 100 : 0

  const breaksRemaining = session.breaks_budget - session.breaks_used
  const breaksExhausted = breaksRemaining <= 0

  function handleAbandonClick() {
    if (abandonConfirm) {
      onAbandon()
    } else {
      setAbandonConfirm(true)
      confirmTimeout.current = setTimeout(() => setAbandonConfirm(false), 3000)
    }
  }

  useEffect(() => {
    return () => {
      if (confirmTimeout.current) clearTimeout(confirmTimeout.current)
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-full px-8 py-12">
      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        {/* Task name */}
        <p className="text-sm tracking-widest uppercase" style={{ color: '#A08060' }}>
          {session.task_name}
        </p>

        {timedOut && (
          <div
            className="w-full text-center text-sm px-4 py-3 rounded-lg"
            style={{ background: '#3d2515', color: '#F5E6CC' }}
          >
            Time's up! You can still continue.
          </div>
        )}

        {error && (
          <p className="text-sm px-3 py-2 rounded w-full text-center" style={{ color: '#F5E6CC', background: '#8B3030' }}>
            {error}
          </p>
        )}

        {/* Main timer */}
        <div
          className="font-mono tabular-nums select-none"
          style={{ fontSize: '5rem', color: '#F4D03F', lineHeight: 1 }}
        >
          {formatted.hours}:{formatted.minutes}:{formatted.seconds}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1a1008' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(100, progress)}%`, background: '#D4A017' }}
          />
        </div>

        {/* Break dots */}
        <div className="flex flex-col items-center gap-1">
          <BreakDots total={session.breaks_budget} used={session.breaks_used} />
          <p className="text-xs" style={{ color: '#A08060' }}>
            {breaksRemaining} break{breaksRemaining !== 1 ? 's' : ''} remaining
          </p>
        </div>

        {/* Silence alarm */}
        {isAlarmPlaying && (
          <button
            onClick={onStopAlarm}
            className="w-full py-3 rounded-lg font-semibold animate-pulse"
            style={{ background: '#8B3030', color: '#F5E6CC' }}
          >
            🔔 Silence Alarm
          </button>
        )}

        {/* Action buttons */}
        <div className="flex flex-col w-full gap-3">
          <button
            onClick={onTakeBreak}
            disabled={breaksExhausted}
            className="w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-30"
            style={{ background: '#3d2515', color: '#F5E6CC' }}
          >
            Take a Break{breaksExhausted ? ' (none left)' : ` (${breaksRemaining} left)`}
          </button>

          <button
            onClick={onEnd}
            className="w-full py-3 rounded-lg font-semibold"
            style={{ background: '#D4A017', color: '#0f0a05' }}
          >
            End Session
          </button>

          <button
            onClick={handleAbandonClick}
            className="w-full py-2 rounded-lg text-sm transition-colors"
            style={{
              background: abandonConfirm ? '#8B3030' : 'transparent',
              color: abandonConfirm ? '#F5E6CC' : '#A08060',
              border: `1px solid ${abandonConfirm ? '#8B3030' : '#3d2515'}`,
            }}
          >
            {abandonConfirm ? 'Confirm Abandon?' : 'Abandon'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────── Break view ──────────────────────────────────────

interface BreakViewProps {
  formatted: { hours: string; minutes: string; seconds: string }
  isAlarmPlaying: boolean
  onStopAlarm: () => void
}

function BreakView({ formatted, isAlarmPlaying, onStopAlarm }: BreakViewProps) {
  return (
    <div className="flex items-center justify-center min-h-full px-8 py-12">
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-3xl font-semibold" style={{ color: '#F5E6CC' }}>
          Break Time!
        </h2>
        <p className="text-sm" style={{ color: '#A08060' }}>
          Rest up — your timer is counting down
        </p>
        <div
          className="font-mono tabular-nums select-none"
          style={{ fontSize: '4rem', color: '#F4D03F', lineHeight: 1 }}
        >
          {formatted.minutes}:{formatted.seconds}
        </div>
        <p className="text-xs" style={{ color: '#A08060' }}>
          Get back to focus when it hits zero
        </p>
        {isAlarmPlaying && (
          <button
            onClick={onStopAlarm}
            className="px-6 py-3 rounded-lg font-semibold animate-pulse"
            style={{ background: '#8B3030', color: '#F5E6CC' }}
          >
            🔔 Silence Alarm
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────── Completed view ──────────────────────────────────

interface CompletedViewProps {
  session: import('../api/client').Session
  newlyUnlocked: string[]
  onNewSession: () => void
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 1) return '< 1m'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

function CompletedView({ session, newlyUnlocked, onNewSession }: CompletedViewProps) {
  const actualMinutes = session.actual_duration_minutes ?? session.planned_duration_minutes
  const failed = session.status === 'failed'

  return (
    <div className="flex items-center justify-center min-h-full px-8 py-12">
      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        <div className="text-5xl">{failed ? '❌' : '✅'}</div>
        <h2 className="text-3xl font-semibold text-center" style={{ color: failed ? '#8B3030' : '#F5E6CC' }}>
          {failed ? 'Session Failed' : 'Session Complete!'}
        </h2>
        {failed && (
          <p className="text-sm text-center px-4 py-2 rounded-lg" style={{ background: '#2a0a0a', color: '#A08060' }}>
            You ended early — {formatDuration(actualMinutes)} of {formatDuration(session.planned_duration_minutes)} planned
          </p>
        )}
        <p className="text-lg" style={{ color: '#A08060' }}>
          {session.task_name}
        </p>
        {!failed && (
        <p className="text-sm" style={{ color: '#A08060' }}>
          Duration:{' '}
          <span style={{ color: '#F5E6CC' }}>{formatDuration(actualMinutes)}</span>
        </p>
        )}

        {newlyUnlocked.length > 0 && (
          <div className="w-full flex flex-col gap-3">
            <p className="text-sm font-medium text-center" style={{ color: '#D4A017' }}>
              Achievements Unlocked!
            </p>
            {newlyUnlocked.map((key) => {
              const meta = ACHIEVEMENTS_META[key] ?? { name: key, description: '', icon: '🏆' }
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg"
                  style={{ background: '#1a1008', border: '1px solid #D4A017' }}
                >
                  <span className="text-2xl">{meta.icon}</span>
                  <div className="flex flex-col">
                    <span className="font-medium" style={{ color: '#F5E6CC' }}>{meta.name}</span>
                    <span className="text-xs" style={{ color: '#A08060' }}>{meta.description}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={onNewSession}
          className="w-full py-4 rounded-lg text-lg font-semibold mt-2"
          style={{ background: '#D4A017', color: '#0f0a05' }}
        >
          New Session
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────── Main page ───────────────────────────────────────

// Parse a datetime string from the server as UTC (backend returns naive UTC strings)
function parseUTC(dtStr: string): number {
  return new Date(dtStr.endsWith('Z') ? dtStr : dtStr + 'Z').getTime()
}

export default function SessionPage() {
  const { state, session, newlyUnlocked, error, isAlarmPlaying, start, takeBreak, breakEnded, end, abandon, reset, playAlarm, stopAlarm, primeAlarm } =
    useSession()

  const [timedOut, setTimedOut] = useState(false)
  // Store the user's intended total seconds so short sessions (< 1 min) work correctly
  const plannedTotalSecondsRef = useRef<number>(0)

  const mainTimer = useTimer(0, {
    onExpire: useCallback(() => {
      setTimedOut(true)
      playAlarm()
    }, [playAlarm]),
  })

  const breakTimer = useTimer(BREAK_DURATION_SECONDS, {
    onExpire: useCallback(() => {
      breakEnded()
    }, [breakEnded]),
  })

  // When a session becomes active, start the main timer
  useEffect(() => {
    if (state === 'active' && session) {
      const startedAt = parseUTC(session.started_at)
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      // Use stored seconds for fresh starts, fall back to planned_duration_minutes for reconnects
      const planned = plannedTotalSecondsRef.current > 0
        ? plannedTotalSecondsRef.current
        : session.planned_duration_minutes * 60
      const remaining = Math.max(0, planned - elapsed)
      mainTimer.start(remaining)
      setTimedOut(remaining <= 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, session?.id])

  // When break starts, start the break timer
  useEffect(() => {
    if (state === 'on_break') {
      breakTimer.start(BREAK_DURATION_SECONDS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // When returning from break resume main timer
  useEffect(() => {
    if (state === 'active' && session && mainTimer.timeLeft > 0 && !mainTimer.isRunning) {
      mainTimer.start(mainTimer.timeLeft)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  async function handleStart(
    taskName: string,
    description: string,
    hours: number,
    minutes: number,
    seconds: number,
  ) {
    primeAlarm() // unlock audio on this user gesture so timer-expiry plays work
    const totalSeconds = hours * 3600 + minutes * 60 + seconds
    plannedTotalSecondsRef.current = totalSeconds
    const plannedMinutes = Math.max(1, Math.ceil(totalSeconds / 60))
    await start({ task_name: taskName, description: description || undefined, planned_duration_minutes: plannedMinutes })
    setTimedOut(false)
  }

  async function handleEnd() {
    mainTimer.pause()
    await end()
  }

  async function handleAbandon() {
    mainTimer.pause()
    mainTimer.reset()
    breakTimer.pause()
    breakTimer.reset()
    plannedTotalSecondsRef.current = 0
    setTimedOut(false)
    await abandon()
  }

  async function handleTakeBreak() {
    mainTimer.pause()
    await takeBreak()
  }

  function handleReset() {
    mainTimer.reset()
    breakTimer.reset()
    plannedTotalSecondsRef.current = 0
    setTimedOut(false)
    reset()
  }

  if (state === 'idle') {
    return <StartForm onStart={handleStart} error={error} />
  }

  if (state === 'active' && session) {
    return (
      <ActiveView
        session={session}
        formatted={mainTimer.formatted}
        timedOut={timedOut}
        isAlarmPlaying={isAlarmPlaying}
        onTakeBreak={handleTakeBreak}
        onEnd={handleEnd}
        onAbandon={handleAbandon}
        onStopAlarm={stopAlarm}
        error={error}
      />
    )
  }

  if (state === 'on_break') {
    return (
      <BreakView
        formatted={breakTimer.formatted}
        isAlarmPlaying={isAlarmPlaying}
        onStopAlarm={stopAlarm}
      />
    )
  }

  if (state === 'completed' && session) {
    return (
      <CompletedView
        session={session}
        newlyUnlocked={newlyUnlocked}
        onNewSession={handleReset}
      />
    )
  }

  return null
}
