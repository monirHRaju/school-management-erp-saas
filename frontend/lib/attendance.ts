import { apiRequest } from './api';
import type {
  DailyAttendanceResponse,
  MonthlyAttendanceResponse,
  ReportResponse,
} from '@/types/attendance';

export function getDailyAttendance(
  date: string,
  cls: string,
  section: string,
  shift: string,
  token: string
) {
  const params = new URLSearchParams({ date, class: cls });
  if (section) params.set('section', section);
  if (shift) params.set('shift', shift);
  return apiRequest<DailyAttendanceResponse>(`/api/attendance/daily?${params}`, { token });
}

export function markAttendance(
  date: string,
  cls: string,
  section: string,
  shift: string,
  records: { student_id: string; status: 'present' | 'absent' }[],
  token: string
) {
  return apiRequest<{ success: boolean; data: { marked: number } }>('/api/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ date, class: cls, section, shift, records }),
    token,
  });
}

export function getMonthlyAttendance(
  month: string,
  cls: string,
  section: string,
  shift: string,
  token: string
) {
  const params = new URLSearchParams({ month, class: cls });
  if (section) params.set('section', section);
  if (shift) params.set('shift', shift);
  return apiRequest<MonthlyAttendanceResponse>(`/api/attendance/monthly?${params}`, { token });
}

export function getAttendanceReport(month: string, token: string) {
  return apiRequest<ReportResponse>(`/api/attendance/report?month=${month}`, { token });
}

export interface Holiday {
  _id: string;
  date: string;
  name: string;
  description?: string;
}

export function clearAttendance(date: string, cls: string, section: string, shift: string, token: string) {
  const params = new URLSearchParams({ date, class: cls });
  if (section) params.set('section', section);
  if (shift) params.set('shift', shift);
  return apiRequest<{ success: boolean; data: { deleted: number; date: string; class: string } }>(
    `/api/attendance/clear?${params}`,
    { method: 'DELETE', token }
  );
}

export function getHolidays(month: string, token: string) {
  return apiRequest<{ success: boolean; data: Holiday[] }>(`/api/holidays?month=${month}`, { token });
}

export function createHoliday(date: string, name: string, description: string, token: string) {
  return apiRequest<{ success: boolean; data: Holiday }>('/api/holidays', {
    method: 'POST',
    body: JSON.stringify({ date, name, description }),
    token,
  });
}

export function deleteHoliday(id: string, token: string) {
  return apiRequest<{ success: boolean; data: { deleted: boolean } }>(`/api/holidays/${id}`, {
    method: 'DELETE',
    token,
  });
}
