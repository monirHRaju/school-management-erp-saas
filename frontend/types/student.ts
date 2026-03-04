export interface Student {
  _id: string;
  school_id: string;
  name: string;
  guardianName?: string;
  class?: string;
  section?: string;
  rollNo?: string;
  status: 'active' | 'inactive' | 'left';
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentFormData {
  name: string;
  guardianName?: string;
  class?: string;
  section?: string;
  rollNo?: string;
  status: 'active' | 'inactive' | 'left';
}
