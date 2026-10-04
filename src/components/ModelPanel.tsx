import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryOpenRouter } from '../services/api'
import type { Message, MODEL_CONFIGS, ReplyStats } from '../services/api'
import './ModelPanel.css'

type Config = typeof MODEL_CONFIGS[keyof typeof MODEL_CONFIGS]

function formatDuration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(n: number) {
  return n.toLocaleString()
}

// Single requests are often fractions of a cent, so keep two significant digits below $1
const subDollarFormat = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumSignificantDigits: 2, maximumSignificantDigits: 2,
})
const dollarFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatCost(usd: number) {
  if (usd === 0) return '$0'
  return usd < 1 ? subDollarFormat.format(usd) : dollarFormat.format(usd)
}

interface Props {
  config: Config
  apiKey: string
  sharedQuery: string
  onQueryConsumed: () => void
}

export function ModelPanel({ config, apiKey, sharedQuery, onQueryConsumed }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Consume shared query when it arrives
  useEffect(() => {
    if (!sharedQuery) return
    sendMessage(sharedQuery)
    onQueryConsumed()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedQuery])

  const mutation = useMutation({
    mutationFn: (msgs: Message[]) => queryOpenRouter({ model: config.model, messages: msgs, apiKey }),
    onSuccess: ({ content, stats }) => {
      setMessages(prev => [...prev, { role: 'assistant', content, stats }])
    },
    onError: (err: Error) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${err.message}` },
      ])
    },
  })

  const totals = messages.reduce<Required<ReplyStats> & { replies: number }>(
    (acc, m) => m.stats
      ? {
          replies: acc.replies + 1,
          promptTokens: acc.promptTokens + m.stats.promptTokens,
          completionTokens: acc.completionTokens + m.stats.completionTokens,
          durationMs: acc.durationMs + m.stats.durationMs,
          cost: acc.cost + (m.stats.cost ?? 0),
        }
      : acc,
    { replies: 0, promptTokens: 0, completionTokens: 0, durationMs: 0, cost: 0 },
  )

  function sendMessage(text: string) {
    if (!text.trim() || mutation.isPending) return
    const next: Message[] = [...messages, { role: 'user', content: text.trim() }]
    setMessages(next)
    setInput('')
    mutation.mutate(next)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="panel" style={{ '--accent': config.accent } as React.CSSProperties}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-dot" />
          <span className="panel-name">{config.label}</span>
          <span className="panel-subtitle">{config.model}</span>
        </div>
        <button
          className="panel-clear"
          onClick={() => setMessages([])}
          title="Clear conversation"
          disabled={messages.length === 0}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="panel-messages">
        {messages.length === 0 && (
          <div className="panel-empty">
            <span className="panel-empty-icon">✦</span>
            <span>Start a conversation</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`msg msg-${msg.role}`}>
            <div className="msg-label">{msg.role === 'user' ? 'You' : config.label}</div>
            <div className="msg-content">{msg.content}</div>
            {msg.stats && (
              <div className="msg-stats">
                {formatTokens(msg.stats.promptTokens)} in · {formatTokens(msg.stats.completionTokens)} out · {formatDuration(msg.stats.durationMs)}
                {msg.stats.cost !== undefined && <> · {formatCost(msg.stats.cost)}</>}
              </div>
            )}
          </div>
        ))}
        {mutation.isPending && (
          <div className="msg msg-assistant">
            <div className="msg-label">{config.label}</div>
            <div className="msg-content msg-thinking">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Stats */}
      <div className="panel-stats">
        <div className="panel-stat">
          <span className="panel-stat-label">Tokens</span>
          <span className="panel-stat-value">
            {formatTokens(totals.promptTokens + totals.completionTokens)}
            <span className="panel-stat-detail">
              {' '}({formatTokens(totals.promptTokens)} in / {formatTokens(totals.completionTokens)} out)
            </span>
          </span>
        </div>
        <div className="panel-stat">
          <span className="panel-stat-label">Time</span>
          <span className="panel-stat-value">
            {formatDuration(totals.durationMs)}
            {totals.replies > 0 && (
              <span className="panel-stat-detail"> (avg {formatDuration(totals.durationMs / totals.replies)})</span>
            )}
          </span>
        </div>
        <div className="panel-stat">
          <span className="panel-stat-label">Cost</span>
          <span className="panel-stat-value">
            {formatCost(totals.cost)}
            {totals.replies > 0 && (
              <span className="panel-stat-detail"> (avg {formatCost(totals.cost / totals.replies)})</span>
            )}
          </span>
        </div>
      </div>

      {/* Input */}
      <div className="panel-input-row">
        <textarea
          ref={inputRef}
          className="panel-input"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={apiKey ? 'Message… (Enter to send)' : 'Add OpenRouter key above first'}
          disabled={!apiKey || mutation.isPending}
        />
        <button
          className="panel-send"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || !apiKey || mutation.isPending}
          title="Send"
        >
          ↑
        </button>
      </div>
    </div>
  )
}
