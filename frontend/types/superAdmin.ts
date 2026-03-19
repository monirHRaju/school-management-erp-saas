export interface SuperAdmin {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolWithCounts {
  _id: string;
  name: string;
  slug: string;
  contact?: string;
  subscription_plan: 'free' | 'pro';
  subscription_expiry?: string;
  settings?: Record<string, unknown>;
  userCount: number;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'accountant';
  phone?: string;
}

export interface SchoolDetail {
  school: SchoolWithCounts;
  users: SchoolUser[];
  studentCount: number;
}

export interface SAStats {
  totalSchools: number;
  totalStudents: number;
  totalUsers: number;
  newSchoolsLast30Days: number;
  planBreakdown: Record<string, number>;
}
