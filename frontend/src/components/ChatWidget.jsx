import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Trash2, Sparkles } from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const SUGGESTIONS = [
  'Explain recursion with a simple example',
  'What should I study next on my roadmap?',
  'How do I answer "Tell me about yourself"?',
  'Difference between SQL and NoSQL?',
]

// Opens the chat from anywhere: window.dispatchEvent(new CustomEvent('aibuddy:ask', { detail: { topicId, topicTitle } }))
export const askBuddy = (detail) => window.dispatchEvent(new CustomEvent('aibuddy:ask', { detail }))

// Bold (**x**), italic (*x*) and inline code (`x`) inside one line, as React elements
function renderInline(text, keyBase) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={`${keyBase}-${i}`}>{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`')) return <code key={`${keyBase}-${i}`} className="chat-inline-code">{p.slice(1, -1)}</code>
    return p
  })
}

// Paragraphs, "- " bullets and ``` code blocks
function MessageBody({ text }) {
  const blocks = text.split(/```/)
  return blocks.map((block, bi) => {
    if (bi % 2 === 1) {
      const code = block.replace(/^[a-zA-Z0-9+#-]*\n/, '')
      return <pre key={bi} className="chat-code"><code>{code.trimEnd()}</code></pre>
    }
    const out = []
    let bullets = []
    const flush = (k) => {
      if (bullets.length) out.push(<ul key={`ul-${bi}-${k}`}>{bullets}</ul>)
      bullets = []
    }
    block.split('\n').forEach((line, li) => {
      const t = line.trim()
      const m = t.match(/^([-*•]|\d+\.)\s+(.*)/)
      const h = t.match(/^#{1,6}\s+(.*)/)
      if (m) bullets.push(<li key={`li-${bi}-${li}`}>{renderInline(m[2], `${bi}-${li}`)}</li>)
      else if (h) {
        // The model sometimes adds markdown headings despite the prompt; show them as bold lines
        flush(li)
        out.push(<p key={`h-${bi}-${li}`} className="chat-heading"><strong>{renderInline(h[1].replace(/\*\*/g, ''), `${bi}-${li}`)}</strong></p>)
      } else {
        flush(li)
        if (t) out.push(<p key={`p-${bi}-${li}`}>{renderInline(t, `${bi}-${li}`)}</p>)
      }
    })
    flush('end')
    return out
  })
}

export default function ChatWidget() {
  const { user } = useAuth()
  const storageKey = `aibuddy-chat-${user?._id || 'guest'}`
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || [] } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [topic, setTopic] = useState(null) // { topicId, topicTitle }
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40))) } catch { /* storage unavailable */ }
  }, [messages, storageKey])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    const onAsk = (e) => {
      const d = e.detail || {}
      setOpen(true)
      if (d.topicId) {
        setTopic({ topicId: d.topicId, topicTitle: d.topicTitle })
        setInput(`I have a doubt about "${d.topicTitle}". Can you explain the key ideas simply?`)
      }
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    window.addEventListener('aibuddy:ask', onAsk)
    return () => window.removeEventListener('aibuddy:ask', onAsk)
  }, [])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/chat', { messages: next.slice(-16), topicId: topic?.topicId })
      setMessages(m => [...m, { role: 'assistant', content: res.data?.data?.reply || 'Sorry, I could not answer that.' }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: err.response?.data?.message || 'Something went wrong. Please try again.', error: true }])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Open AI Buddy chat">
          <MessageCircle size={22} />
          <span>Ask AI Buddy</span>
        </button>
      )}

      {open && (
        <section className="chat-panel" aria-label="AI Buddy chat">
          <header className="chat-header">
            <div className="chat-avatar"><Sparkles size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="chat-title">AI Buddy</div>
              <div className="chat-subtitle">Ask any doubt — I know your roadmap</div>
            </div>
            {messages.length > 0 && (
              <button className="chat-icon-btn" onClick={() => { setMessages([]); setTopic(null) }} aria-label="Clear chat" title="Clear chat">
                <Trash2 size={15} />
              </button>
            )}
            <button className="chat-icon-btn" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={17} />
            </button>
          </header>

          {topic && (
            <div className="chat-context">
              <span>Topic: <strong>{topic.topicTitle}</strong></span>
              <button onClick={() => setTopic(null)} aria-label="Remove topic context"><X size={12} /></button>
            </div>
          )}

          <div className="chat-messages" ref={listRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <p>Hi {user?.name?.split(' ')[0] || 'there'}! Stuck on something? Ask me anything about your studies or interviews.</p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role === 'user' ? 'from-user' : 'from-bot'}${m.error ? ' is-error' : ''}`}>
                {m.role === 'user' ? <p>{m.content}</p> : <MessageBody text={m.content} />}
              </div>
            ))}
            {loading && (
              <div className="chat-msg from-bot chat-typing" aria-label="AI Buddy is typing">
                <span /><span /><span />
              </div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send() }}>
            <label htmlFor="chat-input" className="sr-only">Your question</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your doubt…"
              maxLength={2000}
            />
            <button type="submit" className="chat-send" disabled={!input.trim() || loading} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
    </>
  )
}
