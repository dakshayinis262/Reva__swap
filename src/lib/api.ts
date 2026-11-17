import type {
  AdminActivityLog,
  Category,
  ConditionGrade,
  ConditionReport,
  ConditionStage,
  DisputeCategory,
  DisputeReport,
  DisputeStatus,
  ExchangeRequest,
  ExchangeType,
  Item,
  ItemAvailability,
  ItemCondition,
  Message,
  NotificationItem,
  PlatformStats,
  Profile,
  Transaction,
} from '../types';

const TOKEN_STORAGE_KEY = 'reva_swap_auth_token';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });
}

export const api = {
  health: () => requestJson<{ ok: boolean; mode: 'supabase' | 'local-persistent' }>('/api/health'),

  // Auth
  register: (payload: {
    fullName: string;
    email: string;
    studentId: string;
    department: string;
    yearOfStudy: string;
    password: string;
    confirmPassword: string;
  }) =>
    requestJson<{ message: string; email: string; verificationCodePreview: string }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  verifyEmail: (payload: { email: string; code: string }) =>
    requestJson<{ token: string; user: Profile; message: string }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    requestJson<{ token: string; user: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (email: string) =>
    requestJson<{ message: string; resetCodePreview: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (payload: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    requestJson<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => requestJson<{ user: Profile }>('/api/auth/me'),

  updateProfile: (payload: {
    fullName?: string;
    department?: string;
    yearOfStudy?: string;
    bio?: string;
    avatarUrl?: string;
  }) =>
    requestJson<{ user: Profile }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  uploadImage: async (file: File): Promise<string> => {
    const dataUrl = await fileToDataUrl(file);
    const res = await requestJson<{ url: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, fileName: file.name }),
    });
    return res.url;
  },

  // Marketplace
  getStats: () => requestJson<PlatformStats>('/api/stats'),
  getCategories: () => requestJson<{ categories: Category[] }>('/api/categories'),

  getItems: (params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return requestJson<{ items: Item[] }>(`/api/items${suffix}`);
  },

  getItem: (id: string) => requestJson<{ item: Item }>(`/api/items/${id}`),

  createItem: (payload: {
    title: string;
    categoryId: string;
    description: string;
    condition: ItemCondition;
    exchangeType: ExchangeType;
    price: number;
    borrowingDurationDays: number | null;
    availability: ItemAvailability;
    pickupLocation: string;
    swapPreferences?: string;
    imageUrls: string[];
  }) =>
    requestJson<{ item: Item }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateItem: (
    id: string,
    payload: Partial<{
      title: string;
      categoryId: string;
      description: string;
      condition: ItemCondition;
      exchangeType: ExchangeType;
      price: number;
      borrowingDurationDays: number | null;
      availability: ItemAvailability;
      pickupLocation: string;
      swapPreferences: string;
      imageUrls: string[];
    }>
  ) =>
    requestJson<{ item: Item }>(`/api/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteItem: (id: string) =>
    requestJson<{ success: boolean }>(`/api/items/${id}`, { method: 'DELETE' }),

  // Requests & Transactions
  getRequests: () => requestJson<{ requests: ExchangeRequest[] }>('/api/requests'),

  createRequest: (payload: {
    itemId: string;
    message: string;
    proposedSwapItem?: string;
    requestedDurationDays?: number;
  }) =>
    requestJson<{ request: ExchangeRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRequestStatus: (
    id: string,
    status: 'Accepted' | 'Rejected' | 'In Progress' | 'Completed' | 'Cancelled'
  ) =>
    requestJson<{ request: ExchangeRequest }>(`/api/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getTransactions: () => requestJson<{ transactions: Transaction[] }>('/api/transactions'),

  submitConditionReport: (
    transactionId: string,
    payload: {
      stage: ConditionStage;
      conditionGrade: ConditionGrade;
      notes: string;
      photoUrls: string[];
    }
  ) =>
    requestJson<{ conditionReport: ConditionReport }>(
      `/api/transactions/${transactionId}/condition-report`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  confirmReturn: (transactionId: string) =>
    requestJson<{ transaction: Transaction }>(`/api/transactions/${transactionId}/confirm-return`, {
      method: 'POST',
    }),

  // Disputes
  getDisputes: () => requestJson<{ disputes: DisputeReport[] }>('/api/disputes'),

  createDispute: (payload: {
    transactionId?: string | null;
    itemId: string;
    category: DisputeCategory;
    description: string;
    photoUrls: string[];
  }) =>
    requestJson<{ dispute: DisputeReport }>('/api/disputes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDispute: (
    id: string,
    payload: { status: DisputeStatus; adminNotes: string; resolutionSummary: string }
  ) =>
    requestJson<{ dispute: DisputeReport }>(`/api/disputes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Messages & Notifications
  getMessages: () => requestJson<{ messages: Message[] }>('/api/messages'),

  sendMessage: (payload: {
    receiverId: string;
    itemId?: string | null;
    requestId?: string | null;
    content: string;
  }) =>
    requestJson<{ message: Message }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getNotifications: () => requestJson<{ notifications: NotificationItem[] }>('/api/notifications'),
  markNotificationRead: (id: string) =>
    requestJson<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    requestJson<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  // Admin
  getAdminOverview: () =>
    requestJson<{ stats: PlatformStats; activityLogs: AdminActivityLog[] }>('/api/admin/overview'),

  getAdminStudents: () =>
    requestJson<{
      students: Array<Profile & { listingCount: number; exchangeCount: number }>;
    }>('/api/admin/students'),

  updateStudentStatus: (
    id: string,
    verificationStatus: 'Pending' | 'Verified' | 'Suspended'
  ) =>
    requestJson<{ student: Profile }>(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus }),
    }),
};
