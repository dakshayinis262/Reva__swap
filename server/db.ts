import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './auth.ts';
import type {
  AdminActivityLog,
  Category,
  ConditionReport,
  DisputeReport,
  ExchangeRequest,
  Item,
  ItemImage,
  Message,
  NotificationItem,
  Profile,
  Transaction,
} from '../src/types.ts';

export interface StoredUser extends Profile {
  passwordHash: string;
  verificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiresAt: number | null;
}

export interface StoredItemRecord {
  id: string;
  ownerId: string;
  categoryId: string;
  title: string;
  description: string;
  condition: Item['condition'];
  exchangeType: Item['exchangeType'];
  price: number;
  borrowingDurationDays: number | null;
  availability: Item['availability'];
  pickupLocation: string;
  swapPreferences: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  categories: Category[];
  items: StoredItemRecord[];
  itemImages: ItemImage[];
  exchangeRequests: ExchangeRequest[];
  transactions: Transaction[];
  conditionReports: ConditionReport[];
  disputeReports: DisputeReport[];
  messages: Message[];
  notifications: NotificationItem[];
  activityLogs: AdminActivityLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'reva-swap.json');

function createSeedState(): DatabaseState {
  const now = Date.now();
  const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
  const daysFromNow = (d: number) => new Date(now + d * 86400000).toISOString();

  const studentPass = hashPassword('Student@123');
  const adminPass = hashPassword('Admin@123');

  const users: StoredUser[] = [
    {
      id: 'usr-aarav',
      email: 'aarav.sharma@reva.edu.in',
      fullName: 'Aarav Sharma',
      studentId: 'R23CS041',
      department: 'Computer Science & Engineering',
      yearOfStudy: '3rd Year',
      role: 'student',
      emailVerified: true,
      verificationStatus: 'Verified',
      avatarUrl: '',
      bio: 'B.Tech CSE student sharing algorithms textbooks, microcontroller kits, and dorm gear around Main Block.',
      createdAt: daysAgo(45),
      passwordHash: studentPass,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
    {
      id: 'usr-priya',
      email: 'priya.nair@reva.edu.in',
      fullName: 'Priya Nair',
      studentId: 'R24EC019',
      department: 'Electronics & Communication',
      yearOfStudy: '2nd Year',
      role: 'student',
      emailVerified: true,
      verificationStatus: 'Verified',
      avatarUrl: '',
      bio: 'ECE sophomore passionate about sustainable campus sharing and hardware prototyping.',
      createdAt: daysAgo(38),
      passwordHash: studentPass,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
    {
      id: 'usr-rohan',
      email: 'rohan.menon@reva.edu.in',
      fullName: 'Rohan Menon',
      studentId: 'R22ME088',
      department: 'Mechanical Engineering',
      yearOfStudy: '4th Year',
      role: 'student',
      emailVerified: true,
      verificationStatus: 'Verified',
      avatarUrl: '',
      bio: 'Final-year mechanical student passing along drafting tools, badminton gear, and hostel essentials.',
      createdAt: daysAgo(30),
      passwordHash: studentPass,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
    {
      id: 'usr-ananya',
      email: 'ananya.rao@reva.edu.in',
      fullName: 'Ananya Rao',
      studentId: 'R25BT012',
      department: 'Biotechnology',
      yearOfStudy: '1st Year',
      role: 'student',
      emailVerified: true,
      verificationStatus: 'Pending',
      avatarUrl: '',
      bio: 'Freshman looking to borrow semester textbooks and lab safety equipment.',
      createdAt: daysAgo(12),
      passwordHash: studentPass,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
    {
      id: 'usr-admin',
      email: 'admin@reva.edu.in',
      fullName: 'Campus Admin Team',
      studentId: 'ADM-001',
      department: 'Student Affairs & Campus Operations',
      yearOfStudy: 'Staff',
      role: 'admin',
      emailVerified: true,
      verificationStatus: 'Verified',
      avatarUrl: '',
      bio: 'Official REVA SWAP community moderation and dispute resolution desk.',
      createdAt: daysAgo(60),
      passwordHash: adminPass,
      verificationToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  ];

  const categories: Category[] = [
    {
      id: 'cat-books',
      name: 'Books & Notes',
      slug: 'books-notes',
      description: 'Textbooks, exam guides, handwritten notes, and reference manuals.',
      sortOrder: 1,
    },
    {
      id: 'cat-electronics',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Scientific calculators, headphones, tablets, chargers, and peripherals.',
      sortOrder: 2,
    },
    {
      id: 'cat-lab',
      name: 'Lab Equipment',
      slug: 'lab-equipment',
      description: 'Lab coats, multimeters, breadboards, safety goggles, and kits.',
      sortOrder: 3,
    },
    {
      id: 'cat-sports',
      name: 'Sports Equipment',
      slug: 'sports-equipment',
      description: 'Badminton rackets, footballs, cricket gear, and fitness accessories.',
      sortOrder: 4,
    },
    {
      id: 'cat-stationery',
      name: 'Stationery',
      slug: 'stationery',
      description: 'Drafting kits, engineering drawing boards, markers, and organizers.',
      sortOrder: 5,
    },
    {
      id: 'cat-hostel',
      name: 'Hostel Essentials',
      slug: 'hostel-essentials',
      description: 'Desk lamps, electric kettles, extension boards, and storage.',
      sortOrder: 6,
    },
    {
      id: 'cat-other',
      name: 'Other Items',
      slug: 'other-items',
      description: 'Musical instruments, backpacks, bicycle locks, and campus gear.',
      sortOrder: 7,
    },
  ];

  const items: StoredItemRecord[] = [
    {
      id: 'itm-clrs-bundle',
      ownerId: 'usr-aarav',
      categoryId: 'cat-books',
      title: 'Introduction to Algorithms (4th Ed.) + Calculus & CS Notes Bundle',
      description:
        'Complete 3rd-semester computer science bundle including CLRS Algorithms 4th Edition, Stewart Calculus 9th Edition, and neatly indexed spiral lecture notes. Minimal pencil annotations only.',
      condition: 'Like New',
      exchangeType: 'Swap',
      price: 0,
      borrowingDurationDays: null,
      availability: 'Available',
      pickupLocation: 'Swami Vivekananda Block Lobby',
      swapPreferences: 'Operating Systems textbook, Computer Networks book, or Raspberry Pi kit',
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      id: 'itm-casio-calc',
      ownerId: 'usr-priya',
      categoryId: 'cat-electronics',
      title: 'Casio Prizm Graphing & Scientific Calculator + Steel Ruler',
      description:
        'Exam-ready graphing calculator with crisp LCD display, fresh AAA batteries installed, and protective slide cover. Includes 30cm stainless steel drafting ruler.',
      condition: 'Like New',
      exchangeType: 'Borrow',
      price: 0,
      borrowingDurationDays: 14,
      availability: 'Borrowed',
      pickupLocation: 'Central Library Entrance Desk',
      swapPreferences: '',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
    },
    {
      id: 'itm-headphones',
      ownerId: 'usr-rohan',
      categoryId: 'cat-electronics',
      title: 'Wireless Study Headphones + 10,000mAh USB-C Power Bank',
      description:
        'Comfortable over-ear Bluetooth headphones with 35-hour battery life for library study sessions, bundled with a slim aluminum Anker 10,000mAh USB-C portable charger.',
      condition: 'Good',
      exchangeType: 'Sell',
      price: 1850,
      borrowingDurationDays: null,
      availability: 'Available',
      pickupLocation: 'Food Court Courtyard Table 4',
      swapPreferences: '',
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: 'itm-lab-kit',
      ownerId: 'usr-priya',
      categoryId: 'cat-lab',
      title: 'University ECE Electronics Lab Kit (Multimeter, Breadboard & Goggles)',
      description:
        'Organized compartment tray containing a digital multimeter with probes, 830-point breadboard, jumper wires, resistor pack, wire stripper, and clear UVEX lab safety goggles.',
      condition: 'Like New',
      exchangeType: 'Borrow',
      price: 0,
      borrowingDurationDays: 21,
      availability: 'Available',
      pickupLocation: 'ECE Department Ground Floor',
      swapPreferences: '',
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      id: 'itm-badminton',
      ownerId: 'usr-rohan',
      categoryId: 'cat-sports',
      title: 'Twin Carbon-Graphite Badminton Rackets & Mavis 350 Shuttle Tube',
      description:
        'Pair of lightweight Yonex graphite rackets freshly strung at 24 lbs tension plus a tube of 6 nylon shuttlecocks. Great for evening court matches at the Sports Complex.',
      condition: 'Good',
      exchangeType: 'Borrow',
      price: 0,
      borrowingDurationDays: 7,
      availability: 'Available',
      pickupLocation: 'Indoor Sports Complex Reception',
      swapPreferences: '',
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: 'itm-hostel-lamp',
      ownerId: 'usr-rohan',
      categoryId: 'cat-hostel',
      title: 'Minimalist LED Study Desk Lamp & 1.5L Stainless Electric Kettle',
      description:
        'Graduating senior moving out of Boys Hostel Block B. Dimmable 3-temperature LED study lamp and fast-boil stainless steel kettle in clean working condition.',
      condition: 'Good',
      exchangeType: 'Buy',
      price: 950,
      borrowingDurationDays: null,
      availability: 'Available',
      pickupLocation: 'Boys Hostel Block B Gate',
      swapPreferences: '',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'itm-free-notes',
      ownerId: 'usr-aarav',
      categoryId: 'cat-stationery',
      title: '1st-Year Engineering Drawing Kit & Complete Calculus Formula Sheets',
      description:
        'Free pass-it-forward starter kit for incoming first-year students: steel scale, mini-drafter clips, compass box, and laminated semester formula sheets.',
      condition: 'Good',
      exchangeType: 'Free',
      price: 0,
      borrowingDurationDays: null,
      availability: 'Available',
      pickupLocation: 'Main Lawn Reading Pavilion',
      swapPreferences: '',
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
  ];

  const itemImages: ItemImage[] = [
    {
      id: 'img-1',
      itemId: 'itm-clrs-bundle',
      imageUrl: '/src/assets/images/item_textbooks_engineering_1794931445106.jpg',
      sortOrder: 0,
    },
    {
      id: 'img-2',
      itemId: 'itm-casio-calc',
      imageUrl: '/src/assets/images/item_scientific_calculator_1794931446211.jpg',
      sortOrder: 0,
    },
    {
      id: 'img-3',
      itemId: 'itm-headphones',
      imageUrl: '/src/assets/images/item_headphones_electronics_1794931446027.jpg',
      sortOrder: 0,
    },
    {
      id: 'img-4',
      itemId: 'itm-lab-kit',
      imageUrl: '/src/assets/images/item_lab_kit_microscope_1794931446276.jpg',
      sortOrder: 0,
    },
    {
      id: 'img-5',
      itemId: 'itm-badminton',
      imageUrl: '/src/assets/images/item_sports_badminton_racket_1794931447933.jpg',
      sortOrder: 0,
    },
    {
      id: 'img-6',
      itemId: 'itm-hostel-lamp',
      imageUrl: '/src/assets/images/item_hostel_desk_lamp_1794931447464.jpg',
      sortOrder: 0,
    },
    {
      id: 'img-7',
      itemId: 'itm-free-notes',
      imageUrl: '/src/assets/images/item_textbooks_engineering_1794931445106.jpg',
      sortOrder: 0,
    },
  ];

  const exchangeRequests: ExchangeRequest[] = [
    {
      id: 'req-active-borrow',
      itemId: 'itm-casio-calc',
      requesterId: 'usr-aarav',
      ownerId: 'usr-priya',
      requestType: 'Borrow',
      status: 'In Progress',
      message: 'Need the graphing calculator for Linear Algebra internal exams over the next two weeks.',
      proposedSwapItem: '',
      requestedDurationDays: 14,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(4),
    },
    {
      id: 'req-pending-lab',
      itemId: 'itm-lab-kit',
      requesterId: 'usr-ananya',
      ownerId: 'usr-priya',
      requestType: 'Borrow',
      status: 'Pending',
      message: 'Hi Priya, could I borrow the multimeter and lab goggles for next week’s circuits workshop?',
      proposedSwapItem: '',
      requestedDurationDays: 10,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'req-pending-swap',
      itemId: 'itm-clrs-bundle',
      requesterId: 'usr-priya',
      ownerId: 'usr-aarav',
      requestType: 'Swap',
      status: 'Pending',
      message: 'I have Tanenbaum Computer Networks (5th Ed.) in clean condition if you want to swap!',
      proposedSwapItem: 'Computer Networks 5th Edition (Tanenbaum)',
      requestedDurationDays: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'req-completed-past',
      itemId: 'itm-badminton',
      requesterId: 'usr-aarav',
      ownerId: 'usr-rohan',
      requestType: 'Borrow',
      status: 'Completed',
      message: 'Borrowing rackets for the weekend inter-department tournament.',
      proposedSwapItem: '',
      requestedDurationDays: 4,
      createdAt: daysAgo(18),
      updatedAt: daysAgo(14),
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'txn-active-calc',
      requestId: 'req-active-borrow',
      itemId: 'itm-casio-calc',
      borrowerId: 'usr-aarav',
      ownerId: 'usr-priya',
      exchangeType: 'Borrow',
      amount: 0,
      startDate: daysAgo(4),
      expectedReturnDate: daysFromNow(10),
      actualReturnDate: null,
      borrowerReturnConfirmed: false,
      ownerReturnConfirmed: false,
      status: 'Active',
      createdAt: daysAgo(4),
    },
    {
      id: 'txn-completed-racket',
      requestId: 'req-completed-past',
      itemId: 'itm-badminton',
      borrowerId: 'usr-aarav',
      ownerId: 'usr-rohan',
      exchangeType: 'Borrow',
      amount: 0,
      startDate: daysAgo(18),
      expectedReturnDate: daysAgo(14),
      actualReturnDate: daysAgo(14),
      borrowerReturnConfirmed: true,
      ownerReturnConfirmed: true,
      status: 'Completed',
      createdAt: daysAgo(18),
    },
  ];

  const conditionReports: ConditionReport[] = [
    {
      id: 'cond-1',
      transactionId: 'txn-active-calc',
      itemId: 'itm-casio-calc',
      reporterId: 'usr-priya',
      stage: 'Before Handover',
      conditionGrade: 'Excellent',
      notes: 'Screen scratch-free, all keys responsive, slide case intact at Library Desk handover.',
      photoUrls: ['/src/assets/images/item_scientific_calculator_1794931446211.jpg'],
      createdAt: daysAgo(4),
    },
    {
      id: 'cond-2',
      transactionId: 'txn-completed-racket',
      itemId: 'itm-badminton',
      reporterId: 'usr-rohan',
      stage: 'Before Handover',
      conditionGrade: 'Good',
      notes: 'Strings intact, slight grip tape wear on racket #2.',
      photoUrls: ['/src/assets/images/item_sports_badminton_racket_1794931447933.jpg'],
      createdAt: daysAgo(18),
    },
    {
      id: 'cond-3',
      transactionId: 'txn-completed-racket',
      itemId: 'itm-badminton',
      reporterId: 'usr-rohan',
      stage: 'After Return',
      conditionGrade: 'Good',
      notes: 'Returned on schedule with all shuttlecocks accounted for.',
      photoUrls: ['/src/assets/images/item_sports_badminton_racket_1794931447933.jpg'],
      createdAt: daysAgo(14),
    },
  ];

  const disputeReports: DisputeReport[] = [
    {
      id: 'disp-sample-1',
      transactionId: 'txn-completed-racket',
      itemId: 'itm-badminton',
      reporterId: 'usr-rohan',
      reportedUserId: 'usr-aarav',
      category: 'Other',
      description:
        'Sample closed case: Clarified whether shuttlecock tube replacement was expected after tournament play. Both students agreed verbally and confirmed no damage to rackets.',
      photoUrls: ['/src/assets/images/item_sports_badminton_racket_1794931447933.jpg'],
      status: 'Resolved',
      adminNotes: 'Reviewed handover and return condition photos. No structural wear found.',
      resolutionSummary: 'Marked resolved amicably with zero penalties; reminded borrowers that consumables like shuttles are shared-use unless agreed upfront.',
      createdAt: daysAgo(13),
      updatedAt: daysAgo(12),
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg-1',
      senderId: 'usr-priya',
      receiverId: 'usr-aarav',
      itemId: 'itm-casio-calc',
      requestId: 'req-active-borrow',
      content: 'Hi Aarav! Handed over the calculator at the Library Entrance. Let me know if you need spare batteries before your Friday exam.',
      isRead: false,
      createdAt: daysAgo(4),
    },
    {
      id: 'msg-2',
      senderId: 'usr-aarav',
      receiverId: 'usr-priya',
      itemId: 'itm-casio-calc',
      requestId: 'req-active-borrow',
      content: 'Thanks Priya! Works smoothly, I will return it right after the Linear Algebra paper.',
      isRead: true,
      createdAt: daysAgo(3),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'usr-aarav',
      title: 'New Swap Request Received',
      body: 'Priya Nair offered Computer Networks 5th Edition for your CLRS Algorithms bundle.',
      type: 'request',
      linkView: 'requests',
      isRead: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'notif-2',
      userId: 'usr-aarav',
      title: 'Upcoming Borrow Return Reminder',
      body: 'Casio Prizm Graphing Calculator is due back to Priya Nair in 10 days.',
      type: 'return',
      linkView: 'borrowings',
      isRead: false,
      createdAt: daysAgo(0),
    },
    {
      id: 'notif-3',
      userId: 'usr-priya',
      title: 'New Borrow Request',
      body: 'Ananya Rao requested to borrow your ECE Electronics Lab Kit for 10 days.',
      type: 'request',
      linkView: 'requests',
      isRead: false,
      createdAt: daysAgo(1),
    },
  ];

  const activityLogs: AdminActivityLog[] = [
    {
      id: 'act-1',
      actorName: 'Priya Nair',
      action: 'Submitted swap proposal',
      target: 'Introduction to Algorithms (4th Ed.) Bundle',
      timestamp: daysAgo(1),
    },
    {
      id: 'act-2',
      actorName: 'Rohan Menon',
      action: 'Listed new item',
      target: 'Minimalist LED Study Desk Lamp & Kettle',
      timestamp: daysAgo(1),
    },
    {
      id: 'act-3',
      actorName: 'Aarav Sharma',
      action: 'Started active borrow',
      target: 'Casio Prizm Graphing Calculator',
      timestamp: daysAgo(4),
    },
    {
      id: 'act-4',
      actorName: 'Campus Admin Team',
      action: 'Resolved dispute',
      target: 'Twin Carbon-Graphite Badminton Rackets',
      timestamp: daysAgo(12),
    },
  ];

  return {
    users,
    categories,
    items,
    itemImages,
    exchangeRequests,
    transactions,
    conditionReports,
    disputeReports,
    messages,
    notifications,
    activityLogs,
  };
}

let cachedState: DatabaseState | null = null;

export function getDb(): DatabaseState {
  if (cachedState) return cachedState;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      cachedState = JSON.parse(raw) as DatabaseState;
      return cachedState;
    } catch {
      // Fallback to fresh seed if file corrupted
    }
  }
  cachedState = createSeedState();
  saveDb(cachedState);
  return cachedState;
}

export function saveDb(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  cachedState = state;
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function toPublicProfile(user: StoredUser): Profile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    studentId: user.studentId,
    department: user.department,
    yearOfStudy: user.yearOfStudy,
    role: user.role,
    emailVerified: user.emailVerified,
    verificationStatus: user.verificationStatus,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: user.createdAt,
  };
}

export function hydrateItem(db: DatabaseState, record: StoredItemRecord): Item {
  const images = db.itemImages
    .filter((img) => img.itemId === record.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const category = db.categories.find((c) => c.id === record.categoryId);
  const ownerUser = db.users.find((u) => u.id === record.ownerId);
  return {
    ...record,
    images,
    category,
    owner: ownerUser ? toPublicProfile(ownerUser) : undefined,
  };
}
