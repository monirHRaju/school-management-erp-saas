export interface User {
  _id: string;
  school_id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'accountant';
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
