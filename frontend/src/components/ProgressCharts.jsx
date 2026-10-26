import { useState } from 'react'

// Topic status colors — validated for contrast & CVD separation on both themes.
// "Locked" is intentionally neutral gray (a not-started state, not a category).
export const STATUS_COLORS = {
  completed: '#059669',
  current: '#8b5cf6',
  locked: '#64748b',
}
const STATUS_LABELS = { completed: 'Completed', current: 'In progress', locked: 'Locked' }

function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div style={{
      position: 'absolute', left: tip.x, top: tip.y, transform: 'translate(-50%, calc(-100% - 10px))',
      pointerEvents: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border-accent)',
      borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 5,
    }}>
      {tip.text}
    </div>
  )
}

// Donut chart: topic status breakdown for the selected roadmap
export function StatusDonut({ topics }) {
  const [tip, setTip] = useState(null)
  const counts = ['completed', 'current', 'locked'].map(s => ({
    key: s, value: topics.filter(t => t.status === s).length,
  }))
  const total = topics.length
  const size = 160, r = 62, stroke = 22, c = 2 * Math.PI * r, gap = 2

  let offset = 0
  const arcs = counts.filter(d => d.value > 0).map(d => {
    const len = (d.value / total) * c
    const arc = { ...d, len: Math.max(len - (counts.filter(x => x.value).length > 1 ? gap : 0), 0.5), offset }
    offset += len
    return arc
  })
  const pct = total ? Math.round((counts[0].value / total) * 100) : 0

  return (
    <div className="card card-p" style={{ position: 'relative' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Topic Status</h3>
      {total === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No topics yet</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
              aria-label={counts.map(d => `${STATUS_LABELS[d.key]}: ${d.value}`).join(', ')}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-glass)" strokeWidth={stroke} />
              {arcs.map(a => (
                <circle key={a.key} cx={size / 2} cy={size / 2} r={r} fill="none"
                  stroke={STATUS_COLORS[a.key]} strokeWidth={tip?.key === a.key ? stroke + 4 : stroke}
                  strokeDasharray={`${a.len} ${c - a.len}`} strokeDashoffset={-a.offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
                  onMouseMove={e => {
                    const box = e.currentTarget.ownerSVGElement.parentElement.parentElement.parentElement.getBoundingClientRect()
                    setTip({ key: a.key, x: e.clientX - box.left, y: e.clientY - box.top,
                      text: `${STATUS_LABELS[a.key]}: ${a.value} of ${total} (${Math.round(a.value / total * 100)}%)` })
                  }}
                  onMouseLeave={() => setTip(null)}
                />
              ))}
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{pct}%</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>done</span>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {counts.map(d => (
              <li key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[d.key] }} />
                <span style={{ color: 'var(--text-secondary)', minWidth: 80 }}>{STATUS_LABELS[d.key]}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}

// Horizontal bar chart: completion % for every roadmap
export function RoadmapBars({ data, selectedId, onSelect }) {
  const [tip, setTip] = useState(null)
  return (
    <div className="card card-p" style={{ position: 'relative' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Completion by Roadmap</h3>
      {data.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.map(d => {
            const pct = d.total ? Math.round((d.completed / d.total) * 100) : 0
            const active = d.id === selectedId
            return (
              <div key={d.id} style={{ cursor: 'pointer' }} onClick={() => onSelect?.(d.id)}
                onMouseMove={e => {
                  const box = e.currentTarget.parentElement.parentElement.getBoundingClientRect()
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top,
                    text: `${d.name}: ${d.completed} of ${d.total} topics (${pct}%)` })
                }}
                onMouseLeave={() => setTip(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: active ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{d.name}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-glass)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: STATUS_COLORS.current, opacity: active ? 1 : 0.6, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Tooltip tip={tip} />
    </div>
  )
}
