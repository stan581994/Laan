export interface Site {
  id: number
  domain: string
  is_active: boolean
  created_at: string
}

export interface Session {
  id: number
  task_name: string
  description: string | null
  planned_duration_minutes: number
  actual_duration_minutes: number | null
  breaks_budget: number
  breaks_used: number
  status: 'active' | 'completed' | 'abandoned'
  started_at: string
  completed_at: string | null
}

export interface Achievement {
  key: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlocked_at: string | null
}

export interface Stats {
  streak: number
  total_sessions: number
  total_hours: number
  sessions_this_week: number
  weekly_goal: number
  weekly_goal_type: string
  weekly_progress: number
  achievements: Achievement[]
}

export interface Goal {
  target_value: number
  goal_type: string
}

export interface StartSessionData {
  task_name: string
  description?: string
  planned_duration_minutes: number
}

export interface EndSessionResponse {
  session: Session
  newly_unlocked: string[]
}

const BASE_URL = 'http://localhost:7070'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.detail) message = body.detail
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }
  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T
  }
  return res.json() as Promise<T>
}

export const api = {
  // Sites
  getSites(): Promise<Site[]> {
    return request<Site[]>('/api/sites')
  },
  addSite(domain: string): Promise<Site> {
    return request<Site>('/api/sites', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    })
  },
  deleteSite(id: number): Promise<void> {
    return request<void>(`/api/sites/${id}`, { method: 'DELETE' })
  },
  toggleSite(id: number): Promise<Site> {
    return request<Site>(`/api/sites/${id}/toggle`, { method: 'PATCH' })
  },

  // Sessions
  getActiveSession(): Promise<Session | null> {
    return request<Session | null>('/api/sessions/active')
  },
  getSessions(): Promise<Session[]> {
    return request<Session[]>('/api/sessions')
  },
  startSession(data: StartSessionData): Promise<Session> {
    return request<Session>('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  useBreak(id: number): Promise<Session> {
    return request<Session>(`/api/sessions/${id}/break`, { method: 'POST' })
  },
  endSession(id: number): Promise<EndSessionResponse> {
    return request<EndSessionResponse>(`/api/sessions/${id}/end`, { method: 'POST' })
  },
  abandonSession(id: number): Promise<Session> {
    return request<Session>(`/api/sessions/${id}/abandon`, { method: 'POST' })
  },

  // Stats
  getStats(): Promise<Stats> {
    return request<Stats>('/api/stats')
  },

  // Goals
  updateGoal(target_value: number, goal_type: string): Promise<Goal> {
    return request<Goal>('/api/goals', {
      method: 'PUT',
      body: JSON.stringify({ target_value, goal_type }),
    })
  },
}
