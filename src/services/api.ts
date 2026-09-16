export type ModelId = 'claude' | 'chatgpt' | 'gemini' | 'deepseek'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface QueryPayload {
  messages: Message[]
  apiKey: string
}

// ── Claude (Anthropic) ────────────────────────────────────────────────────────
export async function queryClause({ messages, apiKey }: QueryPayload): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

// ── ChatGPT (OpenAI) ──────────────────────────────────────────────────────────
export async function queryChatGPT({ messages, apiKey }: QueryPayload): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message.content ?? ''
}

// ── Gemini (Google) ───────────────────────────────────────────────────────────
export async function queryGemini({ messages, apiKey }: QueryPayload): Promise<string> {
  // Convert to Gemini's content format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } }).error?.message
    throw new Error(msg ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }
  return data.candidates[0]?.content.parts[0]?.text ?? ''
}

// ── DeepSeek ──────────────────────────────────────────────────────────────────
export async function queryDeepSeek({ messages, apiKey }: QueryPayload): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  return data.choices[0]?.message.content ?? ''
}

export const MODEL_CONFIGS = {
  claude: {
    id: 'claude' as ModelId,
    label: 'Claude',
    subtitle: 'claude-sonnet-4-6',
    accentVar: '--accent-claude',
    accent: '#cc785c',
    queryFn: queryClause,
    placeholder: 'Anthropic API key (sk-ant-…)',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  chatgpt: {
    id: 'chatgpt' as ModelId,
    label: 'ChatGPT',
    subtitle: 'gpt-4o',
    accentVar: '--accent-gpt',
    accent: '#19c37d',
    queryFn: queryChatGPT,
    placeholder: 'OpenAI API key (sk-…)',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    id: 'gemini' as ModelId,
    label: 'Gemini',
    subtitle: 'gemini-2.0-flash',
    accentVar: '--accent-gemini',
    accent: '#4285f4',
    queryFn: queryGemini,
    placeholder: 'Google AI API key (AIza…)',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  deepseek: {
    id: 'deepseek' as ModelId,
    label: 'DeepSeek',
    subtitle: 'deepseek-chat',
    accentVar: '--accent-deepseek',
    accent: '#a855f7',
    queryFn: queryDeepSeek,
    placeholder: 'DeepSeek API key (sk-…)',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
} as const
