import { useEffect, useState } from 'react'
import { api, Site } from '../api/client'

export default function BlocklistPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getSites()
      .then(setSites)
      .catch((err: Error) => setError(err.message))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const domain = newDomain.trim()
    if (!domain) return
    setLoading(true)
    setError(null)
    try {
      const site = await api.addSite(domain)
      setSites((prev) => [...prev, site])
      setNewDomain('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add site')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: number) {
    try {
      const updated = await api.toggleSite(id)
      setSites((prev) => prev.map((s) => (s.id === id ? updated : s)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle site')
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteSite(id)
      setSites((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-8" style={{ color: '#F5E6CC' }}>
        Site Blocker
      </h1>

      {/* Add site form */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="example.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg outline-none border focus:border-[#D4A017] transition-colors"
          style={{
            background: '#1a1008',
            border: '1px solid #3d2515',
            color: '#F5E6CC',
          }}
        />
        <button
          type="submit"
          disabled={loading || !newDomain.trim()}
          className="px-6 py-2 rounded-lg font-medium transition-opacity disabled:opacity-40"
          style={{ background: '#D4A017', color: '#0f0a05' }}
        >
          {loading ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && (
        <p
          className="text-sm px-4 py-2 rounded-lg mb-4"
          style={{ background: '#8B3030', color: '#F5E6CC' }}
        >
          {error}
        </p>
      )}

      {/* Site list */}
      {sites.length === 0 ? (
        <p className="text-sm" style={{ color: '#A08060' }}>
          No sites blocked yet. Add a domain above to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((site) => (
            <li
              key={site.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg"
              style={{
                background: '#1a1008',
                border: `1px solid ${site.is_active ? '#D4A017' : '#3d2515'}`,
              }}
            >
              {/* Domain */}
              <span
                className="text-base font-medium"
                style={{ color: site.is_active ? '#D4A017' : '#A08060' }}
              >
                {site.domain}
              </span>

              <div className="flex items-center gap-3">
                {/* Toggle switch */}
                <button
                  onClick={() => handleToggle(site.id)}
                  aria-label={site.is_active ? 'Deactivate' : 'Activate'}
                  className="relative inline-flex items-center w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none"
                  style={{
                    background: site.is_active ? '#D4A017' : '#3d2515',
                  }}
                >
                  <span
                    className="inline-block w-4 h-4 rounded-full transition-transform duration-200"
                    style={{
                      background: '#0f0a05',
                      transform: site.is_active ? 'translateX(24px)' : 'translateX(4px)',
                    }}
                  />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(site.id)}
                  aria-label="Delete site"
                  className="w-7 h-7 flex items-center justify-center rounded text-lg transition-colors hover:bg-[#8B3030]"
                  style={{ color: '#A08060' }}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
