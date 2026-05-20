import { useEffect, useState } from 'react'
import { api, Achievement, Session, Stats } from '../api/client'

// ─────────────────────────── Stats cards ─────────────────────────────────────

interface StatCardProps {
  icon: string
  label: string
  value: string | number
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 px-6 py-5 rounded-lg"
      style={{ background: '#1a1008', border: '1px solid #3d2515' }}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-2xl font-bold" style={{ color: '#F5E6CC' }}>
        {value}
      </span>
      <span className="text-xs uppercase tracking-widest" style={{ color: '#A08060' }}>
        {label}
      </span>
    </div>
  )
}

// ─────────────────────────── Weekly goal ─────────────────────────────────────

interface WeeklyGoalProps {
  stats: Stats
  onGoalUpdate: (targetValue: number, goalType: string) => Promise<void>
}

function WeeklyGoal({ stats, onGoalUpdate }: WeeklyGoalProps) {
  const [editing, setEditing] = useState(false)
  const [targetValue, setTargetValue] = useState(stats.weekly_goal)
  const [goalType, setGoalType] = useState(stats.weekly_goal_type)
  const [saving, setSaving] = useState(false)

  const progress = stats.weekly_goal > 0
    ? Math.min(100, (stats.sessions_this_week / stats.weekly_goal) * 100)
    : 0

  async function handleSave() {
    setSaving(true)
    try {
      await onGoalUpdate(targetValue, goalType)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-4 px-6 py-5 rounded-lg"
      style={{ background: '#1a1008', border: '1px solid #3d2515' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: '#F5E6CC' }}>
          Weekly Goal
        </h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1 rounded transition-colors"
            style={{ color: '#A08060', border: '1px solid #3d2515' }}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={targetValue}
            onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 px-3 py-2 rounded text-center outline-none border focus:border-[#D4A017]"
            style={{
              background: '#0f0a05',
              border: '1px solid #3d2515',
              color: '#F5E6CC',
            }}
          />
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value)}
            className="px-3 py-2 rounded outline-none border focus:border-[#D4A017]"
            style={{
              background: '#0f0a05',
              border: '1px solid #3d2515',
              color: '#F5E6CC',
            }}
          >
            <option value="sessions">sessions</option>
            <option value="hours">hours</option>
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#D4A017', color: '#0f0a05' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded"
            style={{ color: '#A08060', border: '1px solid #3d2515' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="text-sm" style={{ color: '#A08060' }}>
          This Week:{' '}
          <span style={{ color: '#F5E6CC' }}>
            {stats.sessions_this_week} / {stats.weekly_goal}
          </span>{' '}
          {stats.weekly_goal_type}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#0f0a05' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: '#D4A017' }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────── Achievement card ─────────────────────────────────

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const unlockedDate = achievement.unlocked_at
    ? new Date(achievement.unlocked_at).toLocaleDateString()
    : null

  return (
    <div
      className="flex flex-col items-center gap-2 px-4 py-5 rounded-lg text-center transition-opacity"
      style={{
        background: '#1a1008',
        border: `1px solid ${achievement.unlocked ? '#D4A017' : '#3d2515'}`,
        opacity: achievement.unlocked ? 1 : 0.5,
      }}
    >
      <span className="text-3xl">{achievement.icon}</span>
      <span
        className="text-sm font-semibold"
        style={{ color: achievement.unlocked ? '#F5E6CC' : '#A08060' }}
      >
        {achievement.name}
      </span>
      <span className="text-xs" style={{ color: '#A08060' }}>
        {achievement.description}
      </span>
      {unlockedDate && (
        <span className="text-xs mt-1" style={{ color: '#D4A017' }}>
          {unlockedDate}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────── Session row ──────────────────────────────────────

function SessionRow({ session }: { session: Session }) {
  const date = new Date(session.started_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const duration = session.actual_duration_minutes ?? session.planned_duration_minutes
  const hours = Math.floor(duration / 60)
  const mins = duration % 60
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <tr style={{ borderBottom: '1px solid #3d2515' }}>
      <td className="py-3 pr-4 text-sm" style={{ color: '#A08060' }}>
        {date}
      </td>
      <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#F5E6CC' }}>
        {session.task_name}
      </td>
      <td className="py-3 pr-4 text-sm" style={{ color: '#A08060' }}>
        {durationStr}
      </td>
      <td className="py-3 text-sm">
        {session.status === 'completed' ? (
          <span style={{ color: '#D4A017' }}>✅ Completed</span>
        ) : (
          <span style={{ color: '#8B3030' }}>❌ Abandoned</span>
        )}
      </td>
    </tr>
  )
}

// ─────────────────────────── Main page ───────────────────────────────────────

export default function HistoryPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingStats(false))

    api
      .getSessions()
      .then((data) => {
        // Sort most recent first
        const sorted = [...data].sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        )
        setSessions(sorted)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingSessions(false))
  }, [])

  async function handleGoalUpdate(targetValue: number, goalType: string) {
    await api.updateGoal(targetValue, goalType)
    // Refresh stats with new goal
    const fresh = await api.getStats()
    setStats(fresh)
  }

  const isLoading = loadingStats || loadingSessions

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full" style={{ color: '#A08060' }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <p className="px-4 py-3 rounded" style={{ background: '#8B3030', color: '#F5E6CC' }}>
          {error}
        </p>
      </div>
    )
  }

  if (!stats) return null

  const completedSessions = sessions.filter((s) => s.status !== 'active')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-10">
      <h1 className="text-2xl font-semibold" style={{ color: '#F5E6CC' }}>
        Stats &amp; History
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="🔥" label="Day Streak" value={stats.streak} />
        <StatCard icon="✅" label="Total Sessions" value={stats.total_sessions} />
        <StatCard icon="⏱" label="Total Hours" value={stats.total_hours.toFixed(1)} />
      </div>

      {/* Weekly goal */}
      <WeeklyGoal stats={stats} onGoalUpdate={handleGoalUpdate} />

      {/* Achievements */}
      {stats.achievements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#F5E6CC' }}>
            Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.achievements.map((a) => (
              <AchievementCard key={a.key} achievement={a} />
            ))}
          </div>
        </section>
      )}

      {/* Session history table */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#F5E6CC' }}>
          Session History
        </h2>
        {completedSessions.length === 0 ? (
          <p className="text-sm" style={{ color: '#A08060' }}>
            No sessions yet. Complete your first focus session to see history here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #3d2515' }}>
                  {['Date', 'Task', 'Duration', 'Status'].map((col) => (
                    <th
                      key={col}
                      className="pb-2 pr-4 text-left text-xs uppercase tracking-widest font-medium"
                      style={{ color: '#A08060' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedSessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
