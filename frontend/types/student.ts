export interface Student {
  _id: string;
  school_id: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianPhone?: string;
  photoUrl?: string;
  shift?: string;
  group?: string;
   dateOfBirth?: string;
  birthRegNo?: string;
  gender?: string;
  religion?: string;
  class?: string;
  section?: string;
  rollNo?: string;
  monthlyFee?: number;
  admissionDate?: string;
  status: 'active' | 'inactive' | 'left';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFormData {
  name: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianPhone?: string;
  photoUrl?: string;
  shift?: string;
  group?: string;
  dateOfBirth?: string;
  birthRegNo?: string;
  gender?: string;
  religion?: string;
  class?: string;
  section?: string;
  rollNo?: string;
  monthlyFee?: string;
  admissionDate?: string;
  status: 'active' | 'inactive' | 'left';
}
