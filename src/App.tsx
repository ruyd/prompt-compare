import { useState, useRef, useEffect } from 'react'
import { ModelPanel } from './components/ModelPanel'
import { MODEL_CONFIGS, OPENROUTER_KEYS_URL } from './services/api'
import './App.css'

const MODELS = Object.values(MODEL_CONFIGS)
const API_KEY_STORAGE = 'apikey_openrouter'

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? '')
  const [keyVisible, setKeyVisible] = useState(false)
  const [sharedDraft, setSharedDraft] = useState('')
  // Each panel gets its own "pending" shared query; reset after consumed
  const [pendingQuery, setPendingQuery] = useState<string>('')
  const [consumedCount, setConsumedCount] = useState(0)
  const [activeQuery, setActiveQuery] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Save API key to localStorage
  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, apiKey)
  }, [apiKey])

  function handleBroadcast() {
    if (!sharedDraft.trim() || !apiKey) return
    setActiveQuery(sharedDraft.trim())
    setPendingQuery(sharedDraft.trim())
    setConsumedCount(0)
    setSharedDraft('')
  }

  function handleConsumed() {
    setConsumedCount(c => {
      const next = c + 1
      if (next >= MODELS.length) {
        setPendingQuery('')
        setActiveQuery('')
      }
      return next
    })
  }

  return (
    <div className="app">
      {/* Toolbar */}
      <header className="toolbar">
        <div className="toolbar-brand">
          <span className="toolbar-logo">✦</span>
          <span className="toolbar-name">AI</span>
          <span className="toolbar-tagline">Compare models side by side</span>
        </div>

        <div className="toolbar-key">
          <input
            className="toolbar-key-input"
            type={keyVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="OpenRouter API key (sk-or-…)"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="toolbar-key-toggle"
            onClick={() => setKeyVisible(v => !v)}
            title={keyVisible ? 'Hide key' : 'Show key'}
          >
            {keyVisible ? '🙈' : '👁'}
          </button>
          <a
            className="toolbar-key-link"
            href={OPENROUTER_KEYS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Get API key"
          >
            ↗
          </a>
        </div>

        <div className="toolbar-query">
          <textarea
            ref={textareaRef}
            className="toolbar-input"
            rows={1}
            value={sharedDraft}
            onChange={e => setSharedDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleBroadcast()
              }
            }}
            placeholder="Ask all models at once… (Enter to send)"
          />
          <button
            className="toolbar-send"
            onClick={handleBroadcast}
            disabled={!sharedDraft.trim() || !apiKey}
          >
            Send to all
          </button>
        </div>
      </header>

      {/* Panels */}
      <main className="panels">
        {MODELS.map(config => (
          <ModelPanel
            key={config.id}
            config={config}
            apiKey={apiKey}
            sharedQuery={pendingQuery && consumedCount < MODELS.length ? activeQuery : ''}
            onQueryConsumed={handleConsumed}
          />
        ))}
      </main>
    </div>
  )
}
