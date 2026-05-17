export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  student_id: string;
  studentId?: string;
  studentName: string;
  rollNo: string;
  status: AttendanceStatus;
}

export interface DailyAttendanceResponse {
  success: boolean;
  data: {
    students: AttendanceRecord[];
    isWeeklyHoliday?: boolean;
    weeklyHolidayName?: string | null;
  };
}

export type MonthlyDayCode = 'P' | 'A' | 'L' | 'Lv';

export interface MonthlyStudentRow {
  _id: string;
  studentId?: string;
  name: string;
  rollNo: string;
  days: Record<string, MonthlyDayCode>;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  effectivePresent: number;
  percentage: number;
}

export interface MonthlyAttendanceResponse {
  success: boolean;
  data: {
    students: MonthlyStudentRow[];
    totalDays: number;
    daysInMonth: number;
    month: string;
  };
}

export interface ClassSummary {
  class: string;
  section: string;
  totalStudents: number;
  avgAttendance: number;
}

export interface AttendanceTotals {
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export interface ReportResponse {
  success: boolean;
  data: {
    classSummary: ClassSummary[];
    schoolSummary: { totalStudents: number; avgAttendance: number };
    totalDays: number;
    totals: AttendanceTotals;
    totalRecords: number;
  };
}

export interface StudentMonthlyRow {
  _id: string;
  studentId?: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
  days: Record<string, MonthlyDayCode>;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  recorded: number;
  percentage: number;
}

export interface StudentMonthlyResponse {
  success: boolean;
  data: {
    students: StudentMonthlyRow[];
    totals: AttendanceTotals;
    totalRecords: number;
    totalDays: number;
    daysInMonth: number;
    month: string;
  };
}

export interface YearlyMonthEntry {
  month: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  recorded: number;
  percentage: number;
}

export interface StudentYearlyRow {
  _id: string;
  studentId?: string;
  name: string;
  rollNo: string;
  class: string;
  section: string;
  months: YearlyMonthEntry[];
  yearPresent: number;
  yearAbsent: number;
  yearLate: number;
  yearLeave: number;
  yearRecorded: number;
  yearPercentage: number;
}

export interface StudentYearlyResponse {
  success: boolean;
  data: {
    students: StudentYearlyRow[];
    totals: AttendanceTotals;
    totalRecords: number;
    year: number;
  };
}
