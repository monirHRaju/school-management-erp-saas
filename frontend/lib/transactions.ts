import { apiRequest } from '@/lib/api';
import type { CreateExpensePayload, CreateManualIncomePayload, LedgerResponse, LedgerRow } from '@/types/fee';

export async function getLedger(
  params: { from?: string; to?: string },
  token: string
): Promise<LedgerResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const query = search.toString();
  return apiRequest<LedgerResponse>(
    `/api/transactions${query ? `?${query}` : ''}`,
    { token }
  );
}

export async function createExpense(
  body: CreateExpensePayload,
  token: string
): Promise<{ success: boolean; data: LedgerRow }> {
  return apiRequest<{ success: boolean; data: LedgerRow }>('/api/transactions/expense', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function deleteExpense(
  id: string,
  token: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/transactions/expense/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function createManualIncome(
  body: CreateManualIncomePayload,
  token: string
): Promise<{ success: boolean; data: LedgerRow }> {
  return apiRequest<{ success: boolean; data: LedgerRow }>('/api/transactions/income', {
    method: 'POST',
    body: JSON.stringify(body),
    token,
  });
}

export async function deleteManualIncome(
  id: string,
  token: string
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/transactions/income/${id}`, {
    method: 'DELETE',
    token,
  });
}
