export interface FeeStudent {
  _id: string;
  name: string;
  class?: string;
  section?: string;
  rollNo?: string;
}

/** Legacy; prefer FeeCategory for new code */
export type FeeType = 'monthly' | 'admission' | 'exam' | 'book' | 'other';

export type FeeCategory =
  | 'student_fee'
  | 'book_sales'
  | 'stationery'
  | 'exam_fee'
  | 'syllabus_fee'
  | 'fine'
  | 'other';

export const FEE_CATEGORIES: { value: FeeCategory; label: string }[] = [
  { value: 'student_fee', label: 'Student Fee' },
  { value: 'book_sales', label: 'Book Sales' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'exam_fee', label: 'Exam Fee' },
  { value: 'syllabus_fee', label: 'Syllabus Fee' },
  { value: 'fine', label: 'Fine' },
  { value: 'other', label: 'Other' },
];

export interface Fee {
  _id: string;
  school_id: string;
  student_id: FeeStudent | string;
  category?: FeeCategory;
  fee_type?: FeeType;
  month: string;
  description?: string;
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

export interface CollectPayload {
  amount: number;
  discount?: number;
  note?: string;
  payment_date?: string; // ISO date
}

export interface CreateOneTimePayload {
  student_id: string;
  fee_type: 'admission' | 'exam' | 'book' | 'other';
  amount: number;
}

export interface CreateAdditionalPayload {
  category: FeeCategory;
  description?: string;
  month?: string; // YYYY-MM
  amount: number;
  student_id?: string;
  for_all_students?: boolean;
}

export interface FeePayment {
  _id: string;
  fee_id: string;
  amount: number;
  discount?: number;
  note?: string;
  payment_date: string;
  created_by?: { _id: string; name: string };
  createdAt?: string;
}

export interface PayResponse {
  success: boolean;
  data: {
    fee: Fee;
    transaction?: { _id: string; type: string; category: string; amount: number; date: string; related_fee_id?: string };
    feePayment?: { _id: string; amount: number; discount?: number; note?: string; payment_date: string };
  };
}

export interface CollectResponse {
  success: boolean;
  data: {
    fee: Fee;
    feePayment: { _id: string; amount: number; discount?: number; note?: string; payment_date: string };
  };
}

export interface FeeHistoryResponse {
  success: boolean;
  data: FeePayment[];
}

export interface Income {
  _id: string;
  school_id: string;
  category: FeeCategory;
  amount: number;
  student_id?: FeeStudent | string;
  fee_id?: string;
  date: string;
  created_by?: { _id: string; name: string };
  createdAt?: string;
}

export interface IncomeListResponse {
  success: boolean;
  data: Income[];
  total: number;
}

export interface IncomeListParams {
  from?: string;
  to?: string;
  category?: FeeCategory;
  student_id?: string;
  page?: number;
  limit?: number;
}

// ── Income-Expense Ledger ────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'Teachers Salary',
  'Rents',
  'Hospitality',
  'Printing',
  'Stationary',
  'Furniture',
  'Repair',
  'Entertainment',
  'Advertisement',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const MANUAL_INCOME_CATEGORIES = [
  'Selling Assets',
  'Receive Donation',
  'Other',
] as const;

export type ManualIncomeCategory = (typeof MANUAL_INCOME_CATEGORIES)[number];

export interface CreateManualIncomePayload {
  date: string;
  title: string;
  category: ManualIncomeCategory;
  amount: number;
  note?: string;
}

export interface LedgerRow {
  _id: string;
  type: 'income' | 'expense';
  /** 'fee' = from fee collection, 'manual_income' = manually added, 'expense' = expense */
  source?: 'fee' | 'manual_income' | 'expense';
  title: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
}

export interface LedgerResponse {
  success: boolean;
  data: LedgerRow[];
}

export interface CreateExpensePayload {
  date: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
}
