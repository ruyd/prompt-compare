export type ModelId = 'claude' | 'chatgpt' | 'gemini' | 'deepseek'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface QueryPayload {
  model: string
  messages: Message[]
  apiKey: string
}

export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/settings/keys'

// ── OpenRouter (OpenAI-compatible chat completions for every provider) ───────
export async function queryOpenRouter({ model, messages, apiKey }: QueryPayload): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Prompt Compare',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as {
    choices?: Array<{ message: { content: string } }>
    error?: { message?: string }
  }
  // OpenRouter can return 200 with an error body when the upstream provider fails mid-request
  if (data.error) throw new Error(data.error.message ?? 'Unknown OpenRouter error')
  return data.choices?.[0]?.message.content ?? ''
}

export const MODEL_CONFIGS = {
  claude: {
    id: 'claude' as ModelId,
    label: 'Claude',
    model: 'anthropic/claude-sonnet-4.6',
    accentVar: '--accent-claude',
    accent: '#cc785c',
  },
  chatgpt: {
    id: 'chatgpt' as ModelId,
    label: 'ChatGPT',
    model: 'openai/gpt-4o',
    accentVar: '--accent-gpt',
    accent: '#19c37d',
  },
  gemini: {
    id: 'gemini' as ModelId,
    label: 'Gemini',
    model: 'google/gemini-2.0-flash-001',
    accentVar: '--accent-gemini',
    accent: '#4285f4',
  },
  deepseek: {
    id: 'deepseek' as ModelId,
    label: 'DeepSeek',
    model: 'deepseek/deepseek-chat',
    accentVar: '--accent-deepseek',
    accent: '#a855f7',
  },
} as const
