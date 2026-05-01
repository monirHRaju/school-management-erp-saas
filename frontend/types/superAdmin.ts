export interface SuperAdmin {
  _id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanFeatures {
  bulkFeeGeneration: boolean;
  smsNotifications: boolean;
  incomeExpenseTracking: boolean;
  multipleRoles: boolean;
  guardianAccess: boolean;
  exportReports: boolean;
  autoIncomeTracking: boolean;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  maxStudents: number;  // -1 = unlimited
  maxAdmins: number;    // -1 = unlimited
  features: SubscriptionPlanFeatures;
  isActive: boolean;
  mostPopular: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomLimits {
  maxStudents: number | null;
  maxAdmins: number | null;
}

export interface SchoolWithCounts {
  _id: string;
  name: string;
  slug: string;
  contact?: string;
  plan_slug: string;
  subscription_expiry?: string;
  custom_limits?: CustomLimits;
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

export interface SubscriptionInfo {
  plan: SubscriptionPlan | null;
  plan_slug: string;
  subscription_expiry?: string;
  custom_limits?: CustomLimits;
  effective_limits: { maxStudents: number; maxAdmins: number };
}

export interface UsageInfo {
  students: { used: number; max: number; unlimited: boolean };
  admins:   { used: number; max: number; unlimited: boolean };
}
