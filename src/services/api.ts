export type ModelId = 'claude' | 'chatgpt' | 'gemini' | 'deepseek'

export interface ReplyStats {
  promptTokens: number
  completionTokens: number
  durationMs: number
  /** USD charged by OpenRouter, when reported */
  cost?: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  stats?: ReplyStats
}

export interface QueryResult {
  content: string
  stats: ReplyStats
}

export interface QueryPayload {
  model: string
  messages: Message[]
  apiKey: string
}

export const OPENROUTER_KEYS_URL = 'https://openrouter.ai/settings/keys'

// ── OpenRouter (OpenAI-compatible chat completions for every provider) ───────
export async function queryOpenRouter({ model, messages, apiKey }: QueryPayload): Promise<QueryResult> {
  const start = performance.now()
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
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as {
    choices?: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
    error?: { message?: string }
  }
  // OpenRouter can return 200 with an error body when the upstream provider fails mid-request
  if (data.error) throw new Error(data.error.message ?? 'Unknown OpenRouter error')
  return {
    content: data.choices?.[0]?.message.content ?? '',
    stats: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      durationMs: performance.now() - start,
      cost: data.usage?.cost,
    },
  }
}

export const MODEL_CONFIGS = {
  claude: {
    id: 'claude' as ModelId,
    label: 'Claude',
    model: 'anthropic/claude-sonnet-5.5',
    accentVar: '--accent-claude',
    accent: '#cc785c',
  },
  chatgpt: {
    id: 'chatgpt' as ModelId,
    label: 'ChatGPT',
    model: 'openai/gpt-6.1-sol',
    accentVar: '--accent-gpt',
    accent: '#19c37d',
  },
  gemini: {
    id: 'gemini' as ModelId,
    label: 'Gemini',
    model: 'google/gemini-3.8-flash',
    accentVar: '--accent-gemini',
    accent: '#4285f4',
  },
  deepseek: {
    id: 'deepseek' as ModelId,
    label: 'DeepSeek',
    model: 'deepseek/deepseek-v4.1-flash',
    accentVar: '--accent-deepseek',
    accent: '#a855f7',
  },
} as const
