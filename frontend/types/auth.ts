export interface User {
  _id: string;
  school_id: string;
  email?: string;
  phone?: string;
  name: string;
  role: 'admin' | 'staff' | 'accountant' | 'guardian';
  student_ids?: string[];
}

export interface School {
  _id: string;
  name: string;
  slug: string;
}

export interface AuthData {
  token: string;
  user: User;
  school: School;
}

export interface AuthResponse {
  success: boolean;
  data?: AuthData;
  error?: string;
}
