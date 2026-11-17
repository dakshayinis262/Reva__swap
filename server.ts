import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  generateRandomCode,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from './server/auth.ts';
import { getDb, hydrateItem, newId, saveDb, toPublicProfile, type StoredUser } from './server/db.ts';
import type {
  ConditionGrade,
  ConditionStage,
  DisputeCategory,
  DisputeStatus,
  ExchangeType,
  ItemAvailability,
  ItemCondition,
} from './src/types.ts';

dotenv.config();

const PORT = 3000;
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface AuthedRequest extends Request {
  authUser?: StoredUser;
}

function getAuthUserFromRequest(req: Request): StoredUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) return null;
  const db = getDb();
  return db.users.find((u) => u.id === payload.userId) ?? null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  if (user.verificationStatus === 'Suspended') {
    res.status(403).json({ error: 'Your account has been suspended by campus administration.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = getAuthUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required.' });
    return;
  }
  req.authUser = user;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health & backend mode endpoint
  app.get('/api/health', (_req, res) => {
    const supabaseConfigured = Boolean(
      process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
    );
    res.json({
      ok: true,
      mode: supabaseConfigured ? 'supabase' : 'local-persistent',
    });
  });

  // ---------------------------------------------------------------------------
  // AUTHENTICATION ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/auth/register', (req, res) => {
    const {
      fullName,
      email,
      studentId,
      department,
      yearOfStudy,
      password,
      confirmPassword,
    } = req.body as Record<string, string>;

    if (!fullName || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Please enter a valid university email address.' });
      return;
    }
    if (!studentId || studentId.trim().length < 4) {
      res.status(400).json({ error: 'Please provide a valid Student ID (e.g. R23CS041).' });
      return;
    }
    if (!department || !yearOfStudy) {
      res.status(400).json({ error: 'Department and Year of Study are required.' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const db = getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedStudentId = studentId.trim().toUpperCase();

    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this university email already exists.' });
      return;
    }
    if (db.users.some((u) => u.studentId.toUpperCase() === normalizedStudentId)) {
      res.status(409).json({ error: 'This Student ID is already registered.' });
      return;
    }

    const verificationToken = generateRandomCode(6);
    const newUser: StoredUser = {
      id: newId('usr'),
      email: normalizedEmail,
      fullName: fullName.trim(),
      studentId: normalizedStudentId,
      department: department.trim(),
      yearOfStudy: yearOfStudy.trim(),
      role: 'student',
      emailVerified: false,
      verificationStatus: 'Pending',
      avatarUrl: '',
      bio: '',
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(password),
      verificationToken,
      resetToken: null,
      resetTokenExpiresAt: null,
    };

    db.users.push(newUser);
    db.notifications.unshift({
      id: newId('notif'),
      userId: newUser.id,
      title: 'Welcome to REVA SWAP',
      body: 'Complete your student profile and explore items shared across campus.',
      type: 'system',
      linkView: 'profile',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    db.activityLogs.unshift({
      id: newId('act'),
      actorName: newUser.fullName,
      action: 'Registered new student account',
      target: newUser.studentId,
      timestamp: new Date().toISOString(),
    });
    saveDb(db);

    res.status(201).json({
      message: 'Account created. Verify your university email with the 6-digit code to sign in.',
      email: newUser.email,
      verificationCodePreview: verificationToken,
    });
  });

  app.post('/api/auth/verify-email', (req, res) => {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) {
      res.status(400).json({ error: 'Email and verification code are required.' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: 'No account found for that email address.' });
      return;
    }
    if (user.emailVerified) {
      const token = signToken(user.id, user.role);
      res.json({ token, user: toPublicProfile(user), message: 'Email is already verified.' });
      return;
    }
    if (user.verificationToken !== code.trim()) {
      res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
      return;
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationStatus = 'Verified';
    saveDb(db);

    const token = signToken(user.id, user.role);
    res.json({
      token,
      user: toPublicProfile(user),
      message: 'Email verified successfully. Welcome to REVA SWAP!',
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid university email or password.' });
      return;
    }
    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Please verify your email address before signing in.',
        needsVerification: true,
        email: user.email,
        verificationCodePreview: user.verificationToken,
      });
      return;
    }
    if (user.verificationStatus === 'Suspended') {
      res.status(403).json({ error: 'Your account is currently suspended. Contact campus admin.' });
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({ token, user: toPublicProfile(user) });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: 'Please enter your university email address.' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: 'No registered student found with that email address.' });
      return;
    }
    const resetCode = generateRandomCode(6);
    user.resetToken = resetCode;
    user.resetTokenExpiresAt = Date.now() + 15 * 60 * 1000;
    saveDb(db);

    res.json({
      message: 'Password reset code generated. Enter the 6-digit code to set a new password.',
      resetCodePreview: resetCode,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPassword, confirmPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    if (!email || !code || !newPassword) {
      res.status(400).json({ error: 'All reset fields are required.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New passwords do not match.' });
      return;
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !user.resetToken || user.resetToken !== code.trim()) {
      res.status(400).json({ error: 'Invalid password reset code.' });
      return;
    }
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < Date.now()) {
      res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
      return;
    }
    user.passwordHash = hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    saveDb(db);

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    res.json({ user: toPublicProfile(req.authUser!) });
  });

  app.patch('/api/profile', requireAuth, (req: AuthedRequest, res) => {
    const { fullName, department, yearOfStudy, bio, avatarUrl } = req.body as {
      fullName?: string;
      department?: string;
      yearOfStudy?: string;
      bio?: string;
      avatarUrl?: string;
    };
    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }
    if (fullName && fullName.trim().length >= 2) user.fullName = fullName.trim();
    if (department) user.department = department.trim();
    if (yearOfStudy) user.yearOfStudy = yearOfStudy.trim();
    if (typeof bio === 'string') user.bio = bio.trim();
    if (typeof avatarUrl === 'string') user.avatarUrl = avatarUrl;
    saveDb(db);

    res.json({ user: toPublicProfile(user) });
  });

  // ---------------------------------------------------------------------------
  // IMAGE UPLOAD (Saves uploaded base64 image files to /uploads/)
  // ---------------------------------------------------------------------------
  app.post('/api/upload', requireAuth, (req, res) => {
    const { dataUrl, fileName } = req.body as { dataUrl?: string; fileName?: string };
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      res.status(400).json({ error: 'Invalid image payload. Expected image data URL.' });
      return;
    }
    const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Unsupported image format. Use PNG, JPG, or WEBP.' });
      return;
    }
    const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 6 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size exceeds 6MB limit.' });
      return;
    }
    const safeStem = (fileName || 'upload').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    const outName = `${safeStem || 'img'}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
    res.status(201).json({ url: `/uploads/${outName}` });
  });

  // ---------------------------------------------------------------------------
  // PUBLIC STATS, CATEGORIES & MARKETPLACE ITEMS
  // ---------------------------------------------------------------------------
  app.get('/api/stats', (_req, res) => {
    const db = getDb();
    res.json({
      totalStudents: db.users.filter((u) => u.role === 'student').length,
      totalItems: db.items.length,
      availableItems: db.items.filter((i) => i.availability === 'Available').length,
      completedExchanges:
        db.transactions.filter((t) => t.status === 'Completed').length +
        db.exchangeRequests.filter((r) => r.status === 'Completed').length,
      activeExchanges: db.transactions.filter(
        (t) => t.status === 'Active' || t.status === 'Return Pending'
      ).length,
      pendingDisputes: db.disputeReports.filter((d) => d.status !== 'Resolved').length,
    });
  });

  app.get('/api/categories', (_req, res) => {
    const db = getDb();
    res.json({ categories: db.categories });
  });

  app.get('/api/items', (req, res) => {
    const db = getDb();
    const {
      q,
      category,
      exchangeType,
      condition,
      availability,
      minPrice,
      maxPrice,
      sort,
      ownerId,
    } = req.query as Record<string, string | undefined>;

    let results = db.items.map((rec) => hydrateItem(db, rec));

    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      results = results.filter(
        (item) =>
          item.title.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          item.pickupLocation.toLowerCase().includes(term) ||
          (item.owner?.fullName.toLowerCase().includes(term) ?? false) ||
          (item.category?.name.toLowerCase().includes(term) ?? false)
      );
    }

    if (category && category !== 'All') {
      results = results.filter(
        (item) => item.categoryId === category || item.category?.slug === category || item.category?.name === category
      );
    }

    if (exchangeType && exchangeType !== 'All') {
      results = results.filter((item) => item.exchangeType === exchangeType);
    }

    if (condition && condition !== 'All') {
      results = results.filter((item) => item.condition === condition);
    }

    if (availability && availability !== 'All') {
      results = results.filter((item) => item.availability === availability);
    }

    if (ownerId) {
      results = results.filter((item) => item.ownerId === ownerId);
    }

    if (minPrice !== undefined && minPrice !== '') {
      const min = Number(minPrice);
      if (!Number.isNaN(min)) results = results.filter((item) => item.price >= min);
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const max = Number(maxPrice);
      if (!Number.isNaN(max)) results = results.filter((item) => item.price <= max);
    }

    switch (sort) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'title_asc':
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    res.json({ items: results });
  });

  app.get('/api/items/:id', (req, res) => {
    const db = getDb();
    const record = db.items.find((i) => i.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Item listing not found.' });
      return;
    }
    res.json({ item: hydrateItem(db, record) });
  });

  app.post('/api/items', requireAuth, (req: AuthedRequest, res) => {
    const {
      title,
      categoryId,
      description,
      condition,
      exchangeType,
      price,
      borrowingDurationDays,
      availability,
      pickupLocation,
      swapPreferences,
      imageUrls,
    } = req.body as {
      title?: string;
      categoryId?: string;
      description?: string;
      condition?: ItemCondition;
      exchangeType?: ExchangeType;
      price?: number;
      borrowingDurationDays?: number | null;
      availability?: ItemAvailability;
      pickupLocation?: string;
      swapPreferences?: string;
      imageUrls?: string[];
    };

    if (!title || title.trim().length < 3) {
      res.status(400).json({ error: 'Item name must be at least 3 characters.' });
      return;
    }
    if (!categoryId) {
      res.status(400).json({ error: 'Please select a category.' });
      return;
    }
    if (!description || description.trim().length < 10) {
      res.status(400).json({ error: 'Description must be at least 10 characters.' });
      return;
    }
    if (!condition || !exchangeType || !pickupLocation || pickupLocation.trim().length < 3) {
      res.status(400).json({ error: 'Condition, exchange type, and pickup location are required.' });
      return;
    }
    const numericPrice = exchangeType === 'Buy' || exchangeType === 'Sell' ? Number(price ?? 0) : 0;
    if ((exchangeType === 'Buy' || exchangeType === 'Sell') && (Number.isNaN(numericPrice) || numericPrice <= 0)) {
      res.status(400).json({ error: 'Please enter a valid price greater than 0 for Buy/Sell listings.' });
      return;
    }
    const duration =
      exchangeType === 'Borrow' ? Math.max(1, Number(borrowingDurationDays ?? 7)) : null;

    const db = getDb();
    const categoryExists = db.categories.some((c) => c.id === categoryId);
    if (!categoryExists) {
      res.status(400).json({ error: 'Selected category does not exist.' });
      return;
    }

    const now = new Date().toISOString();
    const itemId = newId('itm');
    db.items.unshift({
      id: itemId,
      ownerId: req.authUser!.id,
      categoryId,
      title: title.trim(),
      description: description.trim(),
      condition,
      exchangeType,
      price: numericPrice,
      borrowingDurationDays: duration,
      availability: availability || 'Available',
      pickupLocation: pickupLocation.trim(),
      swapPreferences: (swapPreferences || '').trim(),
      createdAt: now,
      updatedAt: now,
    });

    const validImages = Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls
      : ['/src/assets/images/item_textbooks_engineering_1794931445106.jpg'];

    validImages.forEach((url, index) => {
      db.itemImages.push({
        id: newId('img'),
        itemId,
        imageUrl: url,
        sortOrder: index,
      });
    });

    db.activityLogs.unshift({
      id: newId('act'),
      actorName: req.authUser!.fullName,
      action: 'Listed new item',
      target: title.trim(),
      timestamp: now,
    });
    saveDb(db);

    const created = db.items.find((i) => i.id === itemId)!;
    res.status(201).json({ item: hydrateItem(db, created) });
  });

  app.patch('/api/items/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const item = db.items.find((i) => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    if (item.ownerId !== req.authUser!.id && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only edit your own listings.' });
      return;
    }

    const {
      title,
      categoryId,
      description,
      condition,
      exchangeType,
      price,
      borrowingDurationDays,
      availability,
      pickupLocation,
      swapPreferences,
      imageUrls,
    } = req.body as {
      title?: string;
      categoryId?: string;
      description?: string;
      condition?: ItemCondition;
      exchangeType?: ExchangeType;
      price?: number;
      borrowingDurationDays?: number | null;
      availability?: ItemAvailability;
      pickupLocation?: string;
      swapPreferences?: string;
      imageUrls?: string[];
    };

    if (title && title.trim().length >= 3) item.title = title.trim();
    if (categoryId) item.categoryId = categoryId;
    if (description && description.trim().length >= 10) item.description = description.trim();
    if (condition) item.condition = condition;
    if (exchangeType) item.exchangeType = exchangeType;
    if (price !== undefined) item.price = Math.max(0, Number(price));
    if (borrowingDurationDays !== undefined) item.borrowingDurationDays = borrowingDurationDays;
    if (availability) item.availability = availability;
    if (pickupLocation && pickupLocation.trim().length >= 3) item.pickupLocation = pickupLocation.trim();
    if (typeof swapPreferences === 'string') item.swapPreferences = swapPreferences.trim();
    item.updatedAt = new Date().toISOString();

    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      db.itemImages = db.itemImages.filter((img) => img.itemId !== item.id);
      imageUrls.forEach((url, index) => {
        db.itemImages.push({
          id: newId('img'),
          itemId: item.id,
          imageUrl: url,
          sortOrder: index,
        });
      });
    }

    saveDb(db);
    res.json({ item: hydrateItem(db, item) });
  });

  app.delete('/api/items/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const item = db.items.find((i) => i.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    if (item.ownerId !== req.authUser!.id && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only delete your own listings.' });
      return;
    }
    const activeTxn = db.transactions.find(
      (t) => t.itemId === item.id && (t.status === 'Active' || t.status === 'Return Pending')
    );
    if (activeTxn) {
      res.status(409).json({
        error: 'Cannot delete an item with an active borrowing or pending return.',
      });
      return;
    }

    db.items = db.items.filter((i) => i.id !== item.id);
    db.itemImages = db.itemImages.filter((img) => img.itemId !== item.id);
    db.exchangeRequests = db.exchangeRequests.filter((r) => r.itemId !== item.id);
    saveDb(db);
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // EXCHANGE REQUESTS
  // ---------------------------------------------------------------------------
  app.get('/api/requests', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.authUser!.id;
    const relevant = db.exchangeRequests
      .filter((r) => r.requesterId === uid || r.ownerId === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => {
        const itemRec = db.items.find((i) => i.id === r.itemId);
        const requester = db.users.find((u) => u.id === r.requesterId);
        const owner = db.users.find((u) => u.id === r.ownerId);
        return {
          ...r,
          item: itemRec ? hydrateItem(db, itemRec) : undefined,
          requester: requester ? toPublicProfile(requester) : undefined,
          owner: owner ? toPublicProfile(owner) : undefined,
        };
      });
    res.json({ requests: relevant });
  });

  app.post('/api/requests', requireAuth, (req: AuthedRequest, res) => {
    const { itemId, message, proposedSwapItem, requestedDurationDays } = req.body as {
      itemId?: string;
      message?: string;
      proposedSwapItem?: string;
      requestedDurationDays?: number;
    };

    const db = getDb();
    const item = db.items.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ error: 'Item listing not found.' });
      return;
    }
    if (item.ownerId === req.authUser!.id) {
      res.status(400).json({ error: 'You cannot send an exchange request for your own listing.' });
      return;
    }
    if (item.availability !== 'Available') {
      res.status(409).json({
        error: `This item is currently ${item.availability.toLowerCase()} and cannot accept new reservations.`,
      });
      return;
    }

    const duplicate = db.exchangeRequests.find(
      (r) =>
        r.itemId === item.id &&
        r.requesterId === req.authUser!.id &&
        (r.status === 'Pending' || r.status === 'Accepted' || r.status === 'In Progress')
    );
    if (duplicate) {
      res.status(409).json({
        error: 'You already have an active or pending request for this item.',
      });
      return;
    }

    const conflictingReservation = db.exchangeRequests.find(
      (r) => r.itemId === item.id && (r.status === 'Accepted' || r.status === 'In Progress')
    );
    if (conflictingReservation) {
      res.status(409).json({
        error: 'This item already has an active accepted reservation.',
      });
      return;
    }

    if (item.exchangeType === 'Swap' && (!proposedSwapItem || proposedSwapItem.trim().length < 3)) {
      res.status(400).json({ error: 'Please specify the item you are offering to swap.' });
      return;
    }

    const now = new Date().toISOString();
    const requestId = newId('req');
    const createdReq = {
      id: requestId,
      itemId: item.id,
      requesterId: req.authUser!.id,
      ownerId: item.ownerId,
      requestType: item.exchangeType,
      status: 'Pending' as const,
      message: (message || '').trim(),
      proposedSwapItem: (proposedSwapItem || '').trim(),
      requestedDurationDays:
        item.exchangeType === 'Borrow'
          ? Math.max(1, Number(requestedDurationDays || item.borrowingDurationDays || 7))
          : null,
      createdAt: now,
      updatedAt: now,
    };

    db.exchangeRequests.unshift(createdReq);
    db.notifications.unshift({
      id: newId('notif'),
      userId: item.ownerId,
      title: `New ${item.exchangeType} Request`,
      body: `${req.authUser!.fullName} requested "${item.title}".`,
      type: 'request',
      linkView: 'requests',
      isRead: false,
      createdAt: now,
    });
    db.activityLogs.unshift({
      id: newId('act'),
      actorName: req.authUser!.fullName,
      action: `Sent ${item.exchangeType.toLowerCase()} request`,
      target: item.title,
      timestamp: now,
    });
    saveDb(db);

    res.status(201).json({ request: createdReq });
  });

  app.patch('/api/requests/:id/status', requireAuth, (req: AuthedRequest, res) => {
    const { status } = req.body as { status?: string };
    const db = getDb();
    const request = db.exchangeRequests.find((r) => r.id === req.params.id);
    if (!request) {
      res.status(404).json({ error: 'Exchange request not found.' });
      return;
    }

    const uid = req.authUser!.id;
    const isOwner = request.ownerId === uid;
    const isRequester = request.requesterId === uid;
    if (!isOwner && !isRequester && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this request.' });
      return;
    }

    const item = db.items.find((i) => i.id === request.itemId);
    const now = new Date().toISOString();

    if (status === 'Cancelled') {
      if (!isRequester) {
        res.status(403).json({ error: 'Only the requester can cancel a pending request.' });
        return;
      }
      if (request.status !== 'Pending') {
        res.status(400).json({ error: 'Only pending requests can be cancelled.' });
        return;
      }
      request.status = 'Cancelled';
      request.updatedAt = now;
      saveDb(db);
      res.json({ request });
      return;
    }

    if (!isOwner && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'Only the listing owner can accept or reject requests.' });
      return;
    }

    if (status === 'Rejected') {
      request.status = 'Rejected';
      request.updatedAt = now;
      db.notifications.unshift({
        id: newId('notif'),
        userId: request.requesterId,
        title: 'Exchange Request Declined',
        body: `Your request for "${item?.title || 'item'}" was declined by the owner.`,
        type: 'request',
        linkView: 'requests',
        isRead: false,
        createdAt: now,
      });
      saveDb(db);
      res.json({ request });
      return;
    }

    if (status === 'Accepted' || status === 'In Progress') {
      const conflict = db.exchangeRequests.find(
        (r) =>
          r.itemId === request.itemId &&
          r.id !== request.id &&
          (r.status === 'Accepted' || r.status === 'In Progress')
      );
      if (conflict) {
        res.status(409).json({ error: 'Another request is already active for this item.' });
        return;
      }

      request.status = status === 'In Progress' ? 'In Progress' : 'Accepted';
      request.updatedAt = now;

      if (item) {
        item.availability = item.exchangeType === 'Borrow' ? 'Borrowed' : 'Reserved';
        item.updatedAt = now;
      }

      // Auto-reject competing pending requests to prevent conflicting reservations
      db.exchangeRequests.forEach((other) => {
        if (other.itemId === request.itemId && other.id !== request.id && other.status === 'Pending') {
          other.status = 'Rejected';
          other.updatedAt = now;
          db.notifications.unshift({
            id: newId('notif'),
            userId: other.requesterId,
            title: 'Item Reserved by Another Student',
            body: `"${item?.title || 'Item'}" was reserved via another request.`,
            type: 'request',
            linkView: 'requests',
            isRead: false,
            createdAt: now,
          });
        }
      });

      // Create Transaction record if not already present
      const existingTxn = db.transactions.find((t) => t.requestId === request.id);
      if (!existingTxn && item) {
        const durationDays = request.requestedDurationDays || item.borrowingDurationDays || 7;
        const expectedReturn =
          item.exchangeType === 'Borrow'
            ? new Date(Date.now() + durationDays * 86400000).toISOString()
            : null;
        db.transactions.unshift({
          id: newId('txn'),
          requestId: request.id,
          itemId: item.id,
          borrowerId: request.requesterId,
          ownerId: request.ownerId,
          exchangeType: item.exchangeType,
          amount: item.price,
          startDate: now,
          expectedReturnDate: expectedReturn,
          actualReturnDate: null,
          borrowerReturnConfirmed: false,
          ownerReturnConfirmed: false,
          status: 'Active',
          createdAt: now,
        });
      }

      db.notifications.unshift({
        id: newId('notif'),
        userId: request.requesterId,
        title: `Exchange Request ${request.status}`,
        body: `Your request for "${item?.title || 'item'}" was accepted! Coordinate pickup at ${item?.pickupLocation || 'campus'}.`,
        type: 'request',
        linkView: 'borrowings',
        isRead: false,
        createdAt: now,
      });
      db.activityLogs.unshift({
        id: newId('act'),
        actorName: req.authUser!.fullName,
        action: `Accepted ${request.requestType.toLowerCase()} request`,
        target: item?.title || request.itemId,
        timestamp: now,
      });
      saveDb(db);
      res.json({ request });
      return;
    }

    if (status === 'Completed') {
      request.status = 'Completed';
      request.updatedAt = now;
      const txn = db.transactions.find((t) => t.requestId === request.id);
      if (txn) {
        txn.status = 'Completed';
        txn.actualReturnDate = now;
        txn.borrowerReturnConfirmed = true;
        txn.ownerReturnConfirmed = true;
      }
      if (item) {
        item.availability = item.exchangeType === 'Borrow' ? 'Available' : 'Unavailable';
        item.updatedAt = now;
      }
      saveDb(db);
      res.json({ request });
      return;
    }

    res.status(400).json({ error: 'Unsupported request status transition.' });
  });

  // ---------------------------------------------------------------------------
  // BORROWING, RETURN CONFIRMATION & CONDITION REPORTS
  // ---------------------------------------------------------------------------
  app.get('/api/transactions', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.authUser!.id;
    const isAdmin = req.authUser!.role === 'admin';
    const txns = db.transactions
      .filter((t) => isAdmin || t.borrowerId === uid || t.ownerId === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((t) => {
        const itemRec = db.items.find((i) => i.id === t.itemId);
        const borrower = db.users.find((u) => u.id === t.borrowerId);
        const owner = db.users.find((u) => u.id === t.ownerId);
        const conditionReports = db.conditionReports
          .filter((c) => c.transactionId === t.id)
          .map((c) => ({
            ...c,
            reporter: db.users.find((u) => u.id === c.reporterId)
              ? toPublicProfile(db.users.find((u) => u.id === c.reporterId)!)
              : undefined,
          }));
        return {
          ...t,
          item: itemRec ? hydrateItem(db, itemRec) : undefined,
          borrower: borrower ? toPublicProfile(borrower) : undefined,
          owner: owner ? toPublicProfile(owner) : undefined,
          conditionReports,
        };
      });

    res.json({ transactions: txns });
  });

  app.post('/api/transactions/:id/condition-report', requireAuth, (req: AuthedRequest, res) => {
    const { stage, conditionGrade, notes, photoUrls } = req.body as {
      stage?: ConditionStage;
      conditionGrade?: ConditionGrade;
      notes?: string;
      photoUrls?: string[];
    };
    const db = getDb();
    const txn = db.transactions.find((t) => t.id === req.params.id);
    if (!txn) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }
    const uid = req.authUser!.id;
    if (txn.borrowerId !== uid && txn.ownerId !== uid) {
      res.status(403).json({ error: 'Only transaction participants can submit condition reports.' });
      return;
    }
    if (!stage || !conditionGrade) {
      res.status(400).json({ error: 'Stage and condition grade are required.' });
      return;
    }

    const report = {
      id: newId('cond'),
      transactionId: txn.id,
      itemId: txn.itemId,
      reporterId: uid,
      stage,
      conditionGrade,
      notes: (notes || '').trim(),
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
      createdAt: new Date().toISOString(),
    };
    db.conditionReports.push(report);
    saveDb(db);
    res.status(201).json({ conditionReport: report });
  });

  app.post('/api/transactions/:id/confirm-return', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const txn = db.transactions.find((t) => t.id === req.params.id);
    if (!txn) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }
    const uid = req.authUser!.id;
    if (txn.borrowerId !== uid && txn.ownerId !== uid) {
      res.status(403).json({ error: 'Not authorized to confirm return for this exchange.' });
      return;
    }

    const now = new Date().toISOString();
    if (txn.borrowerId === uid) txn.borrowerReturnConfirmed = true;
    if (txn.ownerId === uid) txn.ownerReturnConfirmed = true;

    const item = db.items.find((i) => i.id === txn.itemId);
    const request = db.exchangeRequests.find((r) => r.id === txn.requestId);

    if (txn.borrowerReturnConfirmed && txn.ownerReturnConfirmed) {
      txn.status = 'Completed';
      txn.actualReturnDate = now;
      if (request) {
        request.status = 'Completed';
        request.updatedAt = now;
      }
      if (item) {
        item.availability = item.exchangeType === 'Borrow' ? 'Available' : 'Unavailable';
        item.updatedAt = now;
      }
      db.notifications.unshift(
        {
          id: newId('notif'),
          userId: txn.borrowerId,
          title: 'Exchange Return Completed',
          body: `Both parties confirmed return for "${item?.title || 'item'}".`,
          type: 'return',
          linkView: 'history',
          isRead: false,
          createdAt: now,
        },
        {
          id: newId('notif'),
          userId: txn.ownerId,
          title: 'Item Returned & Available',
          body: `Return completed for "${item?.title || 'item'}".`,
          type: 'return',
          linkView: 'history',
          isRead: false,
          createdAt: now,
        }
      );
      db.activityLogs.unshift({
        id: newId('act'),
        actorName: req.authUser!.fullName,
        action: 'Completed return verification',
        target: item?.title || txn.itemId,
        timestamp: now,
      });
    } else {
      txn.status = 'Return Pending';
      const otherPartyId = uid === txn.borrowerId ? txn.ownerId : txn.borrowerId;
      db.notifications.unshift({
        id: newId('notif'),
        userId: otherPartyId,
        title: 'Return Confirmation Requested',
        body: `${req.authUser!.fullName} confirmed handover return for "${item?.title || 'item'}". Please verify on your end.`,
        type: 'return',
        linkView: 'borrowings',
        isRead: false,
        createdAt: now,
      });
    }

    saveDb(db);
    res.json({ transaction: txn });
  });

  // ---------------------------------------------------------------------------
  // DAMAGE & DISPUTE REPORTING (Neutral Review — Never Auto-Blames or Deducts)
  // ---------------------------------------------------------------------------
  app.get('/api/disputes', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.authUser!.id;
    const isAdmin = req.authUser!.role === 'admin';
    const disputes = db.disputeReports
      .filter((d) => isAdmin || d.reporterId === uid || d.reportedUserId === uid)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((d) => {
        const itemRec = db.items.find((i) => i.id === d.itemId);
        const reporter = db.users.find((u) => u.id === d.reporterId);
        const reportedUser = d.reportedUserId
          ? db.users.find((u) => u.id === d.reportedUserId)
          : undefined;
        return {
          ...d,
          item: itemRec ? hydrateItem(db, itemRec) : undefined,
          reporter: reporter ? toPublicProfile(reporter) : undefined,
          reportedUser: reportedUser ? toPublicProfile(reportedUser) : undefined,
        };
      });
    res.json({ disputes });
  });

  app.post('/api/disputes', requireAuth, (req: AuthedRequest, res) => {
    const { transactionId, itemId, category, description, photoUrls } = req.body as {
      transactionId?: string | null;
      itemId?: string;
      category?: DisputeCategory;
      description?: string;
      photoUrls?: string[];
    };

    if (!itemId || !category || !description || description.trim().length < 10) {
      res.status(400).json({
        error: 'Item, report category, and a detailed description (10+ characters) are required.',
      });
      return;
    }

    const db = getDb();
    const item = db.items.find((i) => i.id === itemId);
    if (!item) {
      res.status(404).json({ error: 'Referenced item not found.' });
      return;
    }

    const txn = transactionId ? db.transactions.find((t) => t.id === transactionId) : null;
    const reportedUserId = txn
      ? txn.borrowerId === req.authUser!.id
        ? txn.ownerId
        : txn.borrowerId
      : item.ownerId === req.authUser!.id
      ? null
      : item.ownerId;

    const now = new Date().toISOString();
    const dispute = {
      id: newId('disp'),
      transactionId: txn ? txn.id : null,
      itemId: item.id,
      reporterId: req.authUser!.id,
      reportedUserId,
      category,
      description: description.trim(),
      photoUrls: Array.isArray(photoUrls) ? photoUrls : [],
      status: 'Submitted' as DisputeStatus,
      adminNotes: '',
      resolutionSummary: '',
      createdAt: now,
      updatedAt: now,
    };

    if (txn) {
      txn.status = 'Disputed';
    }

    db.disputeReports.unshift(dispute);

    // Notify campus administrators neutrally
    db.users
      .filter((u) => u.role === 'admin')
      .forEach((admin) => {
        db.notifications.unshift({
          id: newId('notif'),
          userId: admin.id,
          title: `New Dispute Submitted: ${category}`,
          body: `${req.authUser!.fullName} submitted an exchange report for "${item.title}".`,
          type: 'dispute',
          linkView: 'admin',
          isRead: false,
          createdAt: now,
        });
      });

    db.activityLogs.unshift({
      id: newId('act'),
      actorName: req.authUser!.fullName,
      action: `Submitted ${category} report`,
      target: item.title,
      timestamp: now,
    });
    saveDb(db);

    res.status(201).json({ dispute });
  });

  app.patch('/api/disputes/:id', requireAdmin, (req: AuthedRequest, res) => {
    const { status, adminNotes, resolutionSummary } = req.body as {
      status?: DisputeStatus;
      adminNotes?: string;
      resolutionSummary?: string;
    };
    const db = getDb();
    const dispute = db.disputeReports.find((d) => d.id === req.params.id);
    if (!dispute) {
      res.status(404).json({ error: 'Dispute report not found.' });
      return;
    }

    const now = new Date().toISOString();
    if (status) dispute.status = status;
    if (typeof adminNotes === 'string') dispute.adminNotes = adminNotes.trim();
    if (typeof resolutionSummary === 'string') dispute.resolutionSummary = resolutionSummary.trim();
    dispute.updatedAt = now;

    if (dispute.status === 'Resolved' && dispute.transactionId) {
      const txn = db.transactions.find((t) => t.id === dispute.transactionId);
      if (txn && txn.status === 'Disputed') {
        txn.status = txn.actualReturnDate ? 'Completed' : 'Active';
      }
    }

    const item = db.items.find((i) => i.id === dispute.itemId);
    db.notifications.unshift({
      id: newId('notif'),
      userId: dispute.reporterId,
      title: `Dispute Status Updated: ${dispute.status}`,
      body: `Campus Admin updated your report on "${item?.title || 'item'}" to ${dispute.status}.`,
      type: 'dispute',
      linkView: 'disputes',
      isRead: false,
      createdAt: now,
    });
    db.activityLogs.unshift({
      id: newId('act'),
      actorName: req.authUser!.fullName,
      action: `Updated dispute to ${dispute.status}`,
      target: item?.title || dispute.id,
      timestamp: now,
    });
    saveDb(db);
    res.json({ dispute });
  });

  // ---------------------------------------------------------------------------
  // MESSAGES & NOTIFICATIONS
  // ---------------------------------------------------------------------------
  app.get('/api/messages', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.authUser!.id;
    const msgs = db.messages
      .filter((m) => m.senderId === uid || m.receiverId === uid)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((m) => {
        const sender = db.users.find((u) => u.id === m.senderId);
        const receiver = db.users.find((u) => u.id === m.receiverId);
        const item = m.itemId ? db.items.find((i) => i.id === m.itemId) : undefined;
        return {
          ...m,
          sender: sender ? toPublicProfile(sender) : undefined,
          receiver: receiver ? toPublicProfile(receiver) : undefined,
          item: item ? hydrateItem(db, item) : undefined,
        };
      });
    res.json({ messages: msgs });
  });

  app.post('/api/messages', requireAuth, (req: AuthedRequest, res) => {
    const { receiverId, itemId, requestId, content } = req.body as {
      receiverId?: string;
      itemId?: string | null;
      requestId?: string | null;
      content?: string;
    };
    if (!receiverId || !content || !content.trim()) {
      res.status(400).json({ error: 'Recipient and message content are required.' });
      return;
    }
    const db = getDb();
    const receiver = db.users.find((u) => u.id === receiverId);
    if (!receiver) {
      res.status(404).json({ error: 'Recipient student not found.' });
      return;
    }
    const now = new Date().toISOString();
    const msg = {
      id: newId('msg'),
      senderId: req.authUser!.id,
      receiverId,
      itemId: itemId ?? null,
      requestId: requestId ?? null,
      content: content.trim(),
      isRead: false,
      createdAt: now,
    };
    db.messages.push(msg);
    db.notifications.unshift({
      id: newId('notif'),
      userId: receiverId,
      title: `New Message from ${req.authUser!.fullName}`,
      body: content.trim().slice(0, 90),
      type: 'message',
      linkView: 'messages',
      isRead: false,
      createdAt: now,
    });
    saveDb(db);

    res.status(201).json({
      message: {
        ...msg,
        sender: toPublicProfile(req.authUser!),
        receiver: toPublicProfile(receiver),
      },
    });
  });

  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const list = db.notifications
      .filter((n) => n.userId === req.authUser!.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ notifications: list });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find(
      (n) => n.id === req.params.id && n.userId === req.authUser!.id
    );
    if (notif) {
      notif.isRead = true;
      saveDb(db);
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    db.notifications.forEach((n) => {
      if (n.userId === req.authUser!.id) n.isRead = true;
    });
    saveDb(db);
    res.json({ success: true });
  });

  // ---------------------------------------------------------------------------
  // ADMIN DASHBOARD ROUTES (Protected by requireAdmin)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = getDb();
    res.json({
      stats: {
        totalStudents: db.users.filter((u) => u.role === 'student').length,
        totalItems: db.items.length,
        availableItems: db.items.filter((i) => i.availability === 'Available').length,
        completedExchanges:
          db.transactions.filter((t) => t.status === 'Completed').length +
          db.exchangeRequests.filter((r) => r.status === 'Completed').length,
        activeExchanges: db.transactions.filter(
          (t) => t.status === 'Active' || t.status === 'Return Pending'
        ).length,
        pendingDisputes: db.disputeReports.filter((d) => d.status !== 'Resolved').length,
      },
      activityLogs: db.activityLogs.slice(0, 20),
    });
  });

  app.get('/api/admin/students', requireAdmin, (_req, res) => {
    const db = getDb();
    const students = db.users
      .filter((u) => u.role === 'student')
      .map((u) => ({
        ...toPublicProfile(u),
        listingCount: db.items.filter((i) => i.ownerId === u.id).length,
        exchangeCount: db.transactions.filter(
          (t) => t.borrowerId === u.id || t.ownerId === u.id
        ).length,
      }));
    res.json({ students });
  });

  app.patch('/api/admin/students/:id', requireAdmin, (req: AuthedRequest, res) => {
    const { verificationStatus } = req.body as {
      verificationStatus?: 'Pending' | 'Verified' | 'Suspended';
    };
    const db = getDb();
    const student = db.users.find((u) => u.id === req.params.id && u.role === 'student');
    if (!student) {
      res.status(404).json({ error: 'Student account not found.' });
      return;
    }
    if (verificationStatus) {
      student.verificationStatus = verificationStatus;
      if (verificationStatus === 'Verified') student.emailVerified = true;
    }
    db.activityLogs.unshift({
      id: newId('act'),
      actorName: req.authUser!.fullName,
      action: `Set student status to ${student.verificationStatus}`,
      target: `${student.fullName} (${student.studentId})`,
      timestamp: new Date().toISOString(),
    });
    saveDb(db);
    res.json({ student: toPublicProfile(student) });
  });

  // ---------------------------------------------------------------------------
  // VITE / STATIC SERVING
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`REVA SWAP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start REVA SWAP server:', err);
  process.exit(1);
});
