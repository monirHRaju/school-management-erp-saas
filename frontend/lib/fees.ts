import { apiRequest } from '@/lib/api';
import type {
  FeesListResponse,
  PayPayload,
  PayResponse,
  CreateOneTimePayload,
  CreateAdditionalPayload,
  CollectPayload,
  CollectResponse,
  FeeHistoryResponse,
  IncomeListResponse,
  IncomeListParams,
} from '@/types/fee';

export async function getFees(
  params: {
    month?: string;
    status?: string;
    class?: string;
    student_id?: string;
    category?: string;
    fee_type?: string;
  },
  token: string
) {
  const search = new URLSearchParams();
  if (params.month) search.set('month', params.month);
  if (params.status) search.set('status', params.status);
  if (params.class) search.set('class', params.class);
  if (params.student_id) search.set('student_id', params.student_id);
  if (params.category) search.set('category', params.category);
  if (params.fee_type) search.set('fee_type', params.fee_type);
  const query = search.toString();
  return apiRequest<FeesListResponse>(
    `/api/fees${query ? `?${query}` : ''}`,
    { token }
  );
}

export async function generateMonth(month: string, token: string) {
  return apiRequest<{ success: boolean; data: { month: string; created: number; updated: number; totalStudents: number } }>(
    '/api/fees/generate-month',
    { method: 'POST', body: JSON.stringify({ month }), token }
  );
}

export async function generateYear(year: number, token: string) {
  return apiRequest<{ success: boolean; data: { year: number; created: number; updated: number; totalStudents: number } }>(
    '/api/fees/generate-year',
    { method: 'POST', body: JSON.stringify({ year }), token }
  );
}

export async function createOneTimeFee(payload: CreateOneTimePayload, token: string) {
  return apiRequest<{ success: boolean; data: import('@/types/fee').Fee }>(
    '/api/fees/one-time',
    { method: 'POST', body: JSON.stringify(payload), token }
  );
}

export async function createAdditionalFee(payload: CreateAdditionalPayload, token: string) {
  return apiRequest<{ success: boolean; data: import('@/types/fee').Fee[]; count: number }>(
    '/api/fees/additional',
    { method: 'POST', body: JSON.stringify(payload), token }
  );
}

export async function payFee(payload: PayPayload, token: string) {
  return apiRequest<PayResponse>(
    '/api/fees/pay',
    { method: 'POST', body: JSON.stringify(payload), token }
  );
}

export async function payFeeById(feeId: string, amount: number, token: string) {
  return apiRequest<PayResponse>(
    `/api/fees/${feeId}/pay`,
    { method: 'POST', body: JSON.stringify({ amount }), token }
  );
}

export async function collectPayment(feeId: string, payload: CollectPayload, token: string) {
  return apiRequest<CollectResponse>(
    `/api/fees/${feeId}/collect`,
    { method: 'POST', body: JSON.stringify(payload), token }
  );
}

export async function getFeeHistory(feeId: string, token: string) {
  return apiRequest<FeeHistoryResponse>(`/api/fees/${feeId}/history`, { token });
}

export async function deleteFee(feeId: string, token: string) {
  return apiRequest<{ success: boolean; data: { deleted: boolean } }>(`/api/fees/${feeId}`, {
    method: 'DELETE',
    token,
  });
}

export async function getIncome(params: IncomeListParams, token: string) {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.category) search.set('category', params.category);
  if (params.student_id) search.set('student_id', params.student_id);
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  const query = search.toString();
  return apiRequest<IncomeListResponse>(
    `/api/income${query ? `?${query}` : ''}`,
    { token }
  );
}
