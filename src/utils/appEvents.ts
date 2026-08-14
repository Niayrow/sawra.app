export const OPEN_READER_EVENT = 'sawra:open-reader';
export const AUTH_PROMPT_EVENT = 'sawra:auth-prompt';

export function requestOpenReader() {
  window.dispatchEvent(new Event(OPEN_READER_EVENT));
}

export function requestAuthPrompt() {
  window.dispatchEvent(new Event(AUTH_PROMPT_EVENT));
}
