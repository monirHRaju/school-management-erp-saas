const SA_TOKEN_KEY = 'sa_token';

export function getSAToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SA_TOKEN_KEY);
}

export function setSAToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SA_TOKEN_KEY, token);
}

export function removeSAToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SA_TOKEN_KEY);
}

export function hasSAToken(): boolean {
  return !!getSAToken();
}
