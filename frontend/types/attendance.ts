export interface AttendanceRecord {
  student_id: string;
  studentName: string;
  rollNo: string;
  status: 'present' | 'absent';
}

export interface DailyAttendanceResponse {
  success: boolean;
  data: { students: AttendanceRecord[] };
}

export interface MonthlyStudentRow {
  _id: string;
  name: string;
  rollNo: string;
  days: Record<string, 'P' | 'A'>;
  totalPresent: number;
  totalAbsent: number;
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

export interface ReportResponse {
  success: boolean;
  data: {
    classSummary: ClassSummary[];
    schoolSummary: { totalStudents: number; avgAttendance: number };
    totalDays: number;
  };
}
