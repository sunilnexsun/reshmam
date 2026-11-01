// Shared constants for the AI Chatbot module.
export const CONV_STATUSES = ['Open', 'Pending', 'Handed over', 'Resolved']

export const PROVIDERS = {
  'Not configured': { models: [], keyPrefix: '', keyHint: '' },
  OpenAI: { models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], keyPrefix: 'sk-', keyHint: 'Starts with “sk-”' },
  Anthropic: { models: ['claude-haiku-4-5', 'claude-sonnet-4-5'], keyPrefix: 'sk-ant-', keyHint: 'Starts with “sk-ant-”' },
  Google: { models: ['gemini-2.5-flash', 'gemini-2.5-pro'], keyPrefix: 'AIza', keyHint: 'Starts with “AIza”' },
}
