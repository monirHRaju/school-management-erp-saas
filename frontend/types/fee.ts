export interface FeeStudent {
  _id: string;
  name: string;
  class?: string;
  section?: string;
  rollNo?: string;
}

export type FeeType = 'monthly' | 'admission' | 'exam' | 'book' | 'other';

export interface Fee {
  _id: string;
  school_id: string;
  student_id: FeeStudent | string;
  fee_type?: FeeType;
  month: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeSummary {
  totalDue: number;
  unpaidCount: number;
}

export interface FeesListResponse {
  success: boolean;
  data: Fee[];
  summary: FeeSummary;
}

export interface GenerateMonthPayload {
  month: string; // YYYY-MM
}

export interface PayPayload {
  student_id: string;
  month: string; // YYYY-MM
  amount: number;
}

export interface CreateOneTimePayload {
  student_id: string;
  fee_type: 'admission' | 'exam' | 'book' | 'other';
  amount: number;
}

export interface PayResponse {
  success: boolean;
  data: {
    fee: Fee;
    transaction: { _id: string; type: string; category: string; amount: number; date: string; related_fee_id?: string };
  };
}
