export type UserRole = 'student' | 'admin';

export type VerificationStatus = 'Pending' | 'Verified' | 'Suspended';

export type ItemCondition = 'New' | 'Like New' | 'Good' | 'Fair';

export type ExchangeType = 'Borrow' | 'Buy' | 'Sell' | 'Swap' | 'Free';

export type ItemAvailability = 'Available' | 'Reserved' | 'Borrowed' | 'Unavailable';

export type RequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type TransactionStatus = 'Active' | 'Return Pending' | 'Completed' | 'Disputed';

export type ConditionStage = 'Before Handover' | 'After Return';

export type ConditionGrade = 'Excellent' | 'Good' | 'Minor Wear' | 'Damaged';

export type DisputeCategory =
  | 'Damaged Product'
  | 'Missing Product'
  | 'Late Return'
  | 'Unreturned Product'
  | 'Other';

export type DisputeStatus = 'Submitted' | 'Under Review' | 'Resolved';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  studentId: string;
  department: string;
  yearOfStudy: string;
  role: UserRole;
  emailVerified: boolean;
  verificationStatus: VerificationStatus;
  avatarUrl: string;
  bio: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

export interface ItemImage {
  id: string;
  itemId: string;
  imageUrl: string;
  sortOrder: number;
}

export interface Item {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  condition: ItemCondition;
  exchangeType: ExchangeType;
  price: number;
  borrowingDurationDays: number | null;
  availability: ItemAvailability;
  pickupLocation: string;
  swapPreferences: string;
  createdAt: string;
  updatedAt: string;
  images: ItemImage[];
  category?: Category;
  owner?: Profile;
}

export interface ExchangeRequest {
  id: string;
  itemId: string;
  requesterId: string;
  ownerId: string;
  requestType: ExchangeType;
  status: RequestStatus;
  message: string;
  proposedSwapItem: string;
  requestedDurationDays: number | null;
  createdAt: string;
  updatedAt: string;
  item?: Item;
  requester?: Profile;
  owner?: Profile;
}

export interface ConditionReport {
  id: string;
  transactionId: string;
  itemId: string;
  reporterId: string;
  stage: ConditionStage;
  conditionGrade: ConditionGrade;
  notes: string;
  photoUrls: string[];
  createdAt: string;
  reporter?: Profile;
}

export interface Transaction {
  id: string;
  requestId: string;
  itemId: string;
  borrowerId: string;
  ownerId: string;
  exchangeType: ExchangeType;
  amount: number;
  startDate: string;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  borrowerReturnConfirmed: boolean;
  ownerReturnConfirmed: boolean;
  status: TransactionStatus;
  createdAt: string;
  item?: Item;
  borrower?: Profile;
  owner?: Profile;
  conditionReports?: ConditionReport[];
}

export interface DisputeReport {
  id: string;
  transactionId: string | null;
  itemId: string;
  reporterId: string;
  reportedUserId: string | null;
  category: DisputeCategory;
  description: string;
  photoUrls: string[];
  status: DisputeStatus;
  adminNotes: string;
  resolutionSummary: string;
  createdAt: string;
  updatedAt: string;
  item?: Item;
  reporter?: Profile;
  reportedUser?: Profile;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  itemId: string | null;
  requestId: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: Profile;
  receiver?: Profile;
  item?: Item;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'request' | 'return' | 'dispute' | 'message' | 'system';
  linkView: string;
  isRead: boolean;
  createdAt: string;
}

export interface PlatformStats {
  totalStudents: number;
  totalItems: number;
  availableItems: number;
  completedExchanges: number;
  activeExchanges: number;
  pendingDisputes: number;
}

export interface AdminActivityLog {
  id: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: string;
}
