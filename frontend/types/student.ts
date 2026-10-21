export interface Student {
  _id: string;
  school_id: string;
  studentId?: string;
  name: string;
  nameBn?: string;
  bloodGroup?: string;
  fatherName?: string;
  fatherProfession?: string;
  fatherMobile?: string;
  fatherMonthlyIncome?: number;
  motherName?: string;
  motherProfession?: string;
  motherMobile?: string;
  motherMonthlyIncome?: number;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  whatsappNumber?: string;
  address?: string;
  photoUrl?: string;
  shift?: string;
  group?: string;
  dateOfBirth?: string;
  birthRegNo?: string;
  gender?: string;
  religion?: string;
  class?: string;
  section?: string;
  session?: string;
  rollNo?: string;
  monthlyFee?: number;
  admissionDate?: string;
  status: 'active' | 'inactive' | 'left';
  statusChangedAt?: string;
  statusReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFormData {
  studentId?: string;
  name: string;
  nameBn?: string;
  bloodGroup?: string;
  fatherName?: string;
  fatherProfession?: string;
  fatherMobile?: string;
  fatherMonthlyIncome?: string;
  motherName?: string;
  motherProfession?: string;
  motherMobile?: string;
  motherMonthlyIncome?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  whatsappNumber?: string;
  address?: string;
  photoUrl?: string;
  shift?: string;
  group?: string;
  dateOfBirth?: string;
  birthRegNo?: string;
  gender?: string;
  religion?: string;
  class?: string;
  section?: string;
  session?: string;
  rollNo?: string;
  monthlyFee?: string;
  admissionDate?: string;
  status: 'active' | 'inactive' | 'left';
}

export interface StudentProfileFeeRecord {
  _id: string;
  category: string;
  month: string;
  description: string;
  total_fee: number;
  paid_amount: number;
  discount_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'unpaid';
  createdAt?: string;
}

export interface StudentProfilePaymentRecord {
  _id: string;
  fee_id: string;
  amount: number;
  discount: number;
  note: string;
  payment_date: string;
  feeCategory?: string;
  feeMonth?: string;
  feeDescription?: string;
}

export interface StudentProfileExamSubject {
  _id: string;
  subject: string;
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
  totalMark: number;
  grade: string;
  gradePoint: number;
  isFail: boolean;
}

export interface StudentProfileExamGroup {
  examId: string;
  examName: string;
  term: string;
  examDate: string | null;
  session: string;
  class: string;
  subjectsCount: number;
  totalMark: number;
  gpa: number;
  isFail: boolean;
  subjects: StudentProfileExamSubject[];
}

export interface StudentProfileData {
  student: Student;
  fees: {
    total: number;
    paid: number;
    discount: number;
    due: number;
    unpaidCount: number;
    records: StudentProfileFeeRecord[];
    payments: StudentProfilePaymentRecord[];
  } | null;
  attendance: {
    thisMonth: {
      present: number;
      absent: number;
      late: number;
      leave: number;
      total: number;
      pct: number;
      records: { _id: string; date: string; status: 'present' | 'absent' | 'late' | 'leave' }[];
    };
    thisYear: {
      present: number;
      absent: number;
      late: number;
      leave: number;
      total: number;
      pct: number;
    };
  };
  results: StudentProfileExamGroup[];
  guardian: {
    accounts: {
      _id: string;
      name: string;
      phone: string;
      status: string;
      isLinked: boolean;
    }[];
  };
  siblings: {
    _id: string;
    studentId?: string;
    name: string;
    class?: string;
    section?: string;
    rollNo?: string;
    photoUrl?: string;
    status: 'active' | 'inactive' | 'left';
  }[];
  counts: {
    fees: number;
    payments: number;
    attendance: number;
    results: number;
  };
}
