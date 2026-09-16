import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { Message } from '../services/api'
import type { MODEL_CONFIGS } from '../services/api'
import './ModelPanel.css'

type Config = typeof MODEL_CONFIGS[keyof typeof MODEL_CONFIGS]

interface Props {
  config: Config
  sharedQuery: string
  onQueryConsumed: () => void
}

export function ModelPanel({ config, sharedQuery, onQueryConsumed }: Props) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(`apikey_${config.id}`) ?? '')
  const [keyVisible, setKeyVisible] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Save API key to localStorage
  useEffect(() => {
    localStorage.setItem(`apikey_${config.id}`, apiKey)
  }, [apiKey, config.id])

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
    mutationFn: (msgs: Message[]) => config.queryFn({ messages: msgs, apiKey }),
    onSuccess: (reply) => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    },
    onError: (err: Error) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${err.message}` },
      ])
    },
  })

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
          <span className="panel-subtitle">{config.subtitle}</span>
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

      {/* API Key row */}
      <div className="panel-key-row">
        <div className="panel-key-wrap">
          <input
            className="panel-key-input"
            type={keyVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={config.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="panel-key-toggle"
            onClick={() => setKeyVisible(v => !v)}
            title={keyVisible ? 'Hide key' : 'Show key'}
          >
            {keyVisible ? '🙈' : '👁'}
          </button>
        </div>
        <a
          className="panel-key-link"
          href={config.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Get API key"
        >
          ↗
        </a>
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

      {/* Input */}
      <div className="panel-input-row">
        <textarea
          ref={inputRef}
          className="panel-input"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={apiKey ? 'Message… (Enter to send)' : 'Add API key above first'}
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
