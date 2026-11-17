import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  Category,
  ConditionGrade,
  ConditionStage,
  DisputeCategory,
  DisputeReport,
  ExchangeRequest,
  Item,
  Message,
  NotificationItem,
  Transaction,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ProductCard, formatExchangePrice } from '../components/ProductCard';
import { ListingFormModal } from '../components/ListingFormModal';
import type { AppView } from '../components/Navbar';

export type DashboardTab =
  | 'overview'
  | 'listings'
  | 'requests'
  | 'borrowings'
  | 'history'
  | 'disputes'
  | 'messages'
  | 'notifications'
  | 'profile';

interface StudentDashboardPageProps {
  categories: Category[];
  onNavigate: (view: AppView) => void;
  onViewItem: (itemId: string) => void;
}

export function StudentDashboardPage({
  categories,
  onNavigate,
  onViewItem,
}: StudentDashboardPageProps) {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [disputes, setDisputes] = useState<DisputeReport[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [requestSubTab, setRequestSubTab] = useState<'incoming' | 'outgoing'>('incoming');

  // Condition report modal state
  const [conditionModalTxn, setConditionModalTxn] = useState<Transaction | null>(null);
  const [condStage, setCondStage] = useState<ConditionStage>('After Return');
  const [condGrade, setCondGrade] = useState<ConditionGrade>('Good');
  const [condNotes, setCondNotes] = useState('');
  const [condPhotos, setCondPhotos] = useState<string[]>([]);

  // Dispute report modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeTxnId, setDisputeTxnId] = useState<string>('');
  const [disputeItemId, setDisputeItemId] = useState<string>('');
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('Damaged Product');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputePhotos, setDisputePhotos] = useState<string[]>([]);

  // Messaging state
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Profile edit state
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profileDept, setProfileDept] = useState(user?.department || '');
  const [profileYear, setProfileYear] = useState(user?.yearOfStudy || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [itemsRes, myItemsRes, reqRes, txnRes, dispRes, msgRes, notifRes] = await Promise.all([
        api.getItems(),
        api.getItems({ ownerId: user.id }),
        api.getRequests(),
        api.getTransactions(),
        api.getDisputes(),
        api.getMessages(),
        api.getNotifications(),
      ]);
      setAllItems(itemsRes.items);
      setMyItems(myItemsRes.items);
      setRequests(reqRes.requests);
      setTransactions(txnRes.transactions);
      setDisputes(dispRes.disputes);
      setMessages(msgRes.messages);
      setNotifications(notifRes.notifications);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (user) {
      setProfileName(user.fullName);
      setProfileDept(user.department);
      setProfileYear(user.yearOfStudy);
      setProfileBio(user.bio);
      setProfileAvatar(user.avatarUrl);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#172554]">Sign In Required</h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          Please log in with your verified student account to access your dashboard.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="px-6 py-2.5 rounded-xl bg-[#172554] text-white text-sm font-semibold"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;
  const activeBorrowings = transactions.filter(
    (t) => t.status === 'Active' || t.status === 'Return Pending' || t.status === 'Disputed'
  );
  const completedTransactions = transactions.filter((t) => t.status === 'Completed');
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const incomingRequests = requests.filter((r) => r.ownerId === user.id);
  const outgoingRequests = requests.filter((r) => r.requesterId === user.id);

  const recommendedItems = allItems
    .filter((i) => i.ownerId !== user.id && i.availability === 'Available')
    .slice(0, 3);

  const handleDeleteItem = async (id: string) => {
    try {
      await api.deleteItem(id);
      showToast('Listing removed.', 'success');
      void loadWorkspace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete listing.', 'error');
    }
  };

  const handleRequestAction = async (
    requestId: string,
    status: 'Accepted' | 'Rejected' | 'In Progress' | 'Completed' | 'Cancelled'
  ) => {
    try {
      await api.updateRequestStatus(requestId, status);
      showToast(`Request marked ${status}.`, 'success');
      void loadWorkspace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update request.', 'error');
    }
  };

  const handleConfirmReturn = async (txnId: string) => {
    try {
      await api.confirmReturn(txnId);
      showToast('Return confirmation recorded.', 'success');
      void loadWorkspace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not confirm return.', 'error');
    }
  };

  const handleUploadPhotos = async (
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (!files || !files.length) return;
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, 4)) {
        urls.push(await api.uploadImage(f));
      }
      setter((prev) => [...prev, ...urls].slice(0, 4));
      showToast('Supporting photo(s) uploaded.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Photo upload failed.', 'error');
    }
  };

  const handleConditionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conditionModalTxn) return;
    try {
      await api.submitConditionReport(conditionModalTxn.id, {
        stage: condStage,
        conditionGrade: condGrade,
        notes: condNotes,
        photoUrls: condPhotos,
      });
      showToast('Condition report logged.', 'success');
      setConditionModalTxn(null);
      setCondNotes('');
      setCondPhotos([]);
      void loadWorkspace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit report.', 'error');
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDispute({
        transactionId: disputeTxnId || null,
        itemId: disputeItemId,
        category: disputeCategory,
        description: disputeDescription,
        photoUrls: disputePhotos,
      });
      showToast('Dispute report submitted for neutral campus admin review.', 'success');
      setDisputeModalOpen(false);
      setDisputeDescription('');
      setDisputePhotos([]);
      void loadWorkspace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit dispute.', 'error');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateProfile({
        fullName: profileName,
        department: profileDept,
        yearOfStudy: profileYear,
        bio: profileBio,
        avatarUrl: profileAvatar,
      });
      await refreshUser();
      showToast('Student profile updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Profile update failed.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await api.uploadImage(file);
      setProfileAvatar(url);
      showToast('Profile photo uploaded. Save profile to apply.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Avatar upload failed.', 'error');
    }
  };

  // Build message threads by peer
  const peersMap = new Map<
    string,
    { id: string; name: string; department: string; lastMessage: Message }
  >();
  messages.forEach((m) => {
    const peer = m.senderId === user.id ? m.receiver : m.sender;
    const peerId = m.senderId === user.id ? m.receiverId : m.senderId;
    if (peer) {
      peersMap.set(peerId, {
        id: peerId,
        name: peer.fullName,
        department: peer.department,
        lastMessage: m,
      });
    }
  });
  const peerList = Array.from(peersMap.values());
  const activePeerId = selectedPeerId || peerList[0]?.id || null;
  const activeThread = activePeerId
    ? messages.filter(
        (m) =>
          (m.senderId === user.id && m.receiverId === activePeerId) ||
          (m.senderId === activePeerId && m.receiverId === user.id)
      )
    : [];

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeerId || !replyText.trim()) return;
    try {
      await api.sendMessage({
        receiverId: activePeerId,
        content: replyText.trim(),
      });
      setReplyText('');
      void loadWorkspace();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send message.', 'error');
    }
  };

  const sidebarItems: Array<{
    id: DashboardTab | 'explore' | 'logout';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'explore', label: 'Explore Items', icon: Search },
    { id: 'listings', label: 'My Listings', icon: Package, count: myItems.length },
    { id: 'requests', label: 'My Requests', icon: ClipboardList, count: pendingRequestsCount },
    { id: 'borrowings', label: 'My Borrowings', icon: Clock, count: activeBorrowings.length },
    { id: 'history', label: 'Exchange History', icon: History },
    { id: 'disputes', label: 'Dispute Reports', icon: AlertTriangle, count: disputes.length },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifCount },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4">
          <div className="pb-4 mb-3 border-b border-slate-100 px-2">
            <p className="font-display text-sm font-bold text-[#172554] truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-slate-500 font-mono truncate">
              {user.studentId} · {user.verificationStatus}
            </p>
          </div>

          <nav aria-label="Student Dashboard Navigation" className="space-y-1">
            {sidebarItems.map((nav) => {
              const Icon = nav.icon;
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    if (nav.id === 'explore') {
                      onNavigate('marketplace');
                    } else if (nav.id === 'logout') {
                      logout();
                      onNavigate('landing');
                    } else {
                      setActiveTab(nav.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#172554] text-white'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#172554]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{nav.label}</span>
                  </span>
                  {typeof nav.count === 'number' && nav.count > 0 && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isActive ? 'text-white/90' : 'text-slate-500'
                      }`}
                    >
                      {nav.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace Viewport */}
        <main className="lg:col-span-9 space-y-6">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#172554]">
                    Welcome back, {user.fullName.split(' ')[0]}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {user.department} · {user.yearOfStudy}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setListingModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#172554] hover:bg-[#1e3270] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add New Listing
                </button>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Total Listed Items</p>
                  <p className="font-display text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                    {myItems.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Pending Requests</p>
                  <p className="font-display text-2xl font-bold text-[#6D5CE7] mt-1 tabular-nums">
                    {pendingRequestsCount}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Active Borrowings</p>
                  <p className="font-display text-2xl font-bold text-[#14B8A6] mt-1 tabular-nums">
                    {activeBorrowings.length}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5">
                  <p className="text-xs text-slate-500">Completed Exchanges</p>
                  <p className="font-display text-2xl font-bold text-[#172554] mt-1 tabular-nums">
                    {completedTransactions.length}
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold text-[#172554]">
                    Recent Activity
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className="text-xs font-semibold text-[#6D5CE7] hover:underline"
                  >
                    View All Notifications
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No recent activity yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.slice(0, 4).map((n) => (
                      <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400 whitespace-nowrap tabular-nums">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended & Recently Added Products */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-semibold text-[#172554]">
                    Recommended Campus Resources
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('marketplace')}
                    className="text-xs font-semibold text-[#6D5CE7] hover:underline"
                  >
                    Explore Marketplace
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {recommendedItems.map((item) => (
                    <ProductCard key={item.id} item={item} onViewDetails={onViewItem} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MY LISTINGS */}
          {activeTab === 'listings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#172554]">My Listings</h1>
                  <p className="text-sm text-slate-500">
                    Add, update, or remove items you have shared on campus.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setListingModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#172554] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Add Item Listing
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading your listings...</p>
              ) : myItems.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm font-medium text-slate-700">
                    You have not listed any items yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setListingModalOpen(true);
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#172554] text-white text-xs font-semibold"
                  >
                    Create Your First Listing
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {myItems.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-20 aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <ImageWithFallback
                            src={item.images[0]?.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewItem(item.id)}
                            className="font-display text-sm font-semibold text-slate-900 hover:text-[#6D5CE7] text-left truncate block max-w-md"
                          >
                            {item.title}
                          </button>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.category?.name} · {item.exchangeType} · {formatExchangePrice(item)} ·{' '}
                            <span className="font-medium text-slate-700">{item.availability}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setListingModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-medium text-red-700 inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY REQUESTS */}
          {activeTab === 'requests' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#172554]">
                    Exchange Requests
                  </h1>
                  <p className="text-sm text-slate-500">
                    Accept, reject, cancel, and track borrow, buy, swap, and free requests.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
                  <button
                    type="button"
                    onClick={() => setRequestSubTab('incoming')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg ${
                      requestSubTab === 'incoming'
                        ? 'bg-white text-[#172554] shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Incoming ({incomingRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestSubTab('outgoing')}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg ${
                      requestSubTab === 'outgoing'
                        ? 'bg-white text-[#172554] shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Sent ({outgoingRequests.length})
                  </button>
                </div>
              </div>

              {(requestSubTab === 'incoming' ? incomingRequests : outgoingRequests).length ===
              0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No {requestSubTab} exchange requests found.
                </p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {(requestSubTab === 'incoming' ? incomingRequests : outgoingRequests).map(
                    (req) => (
                      <div key={req.id} className="py-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="text-xs text-slate-500">
                              {req.requestType} · Status:{' '}
                              <span className="font-semibold text-[#172554]">{req.status}</span> ·{' '}
                              <span className="font-mono tabular-nums">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </span>
                            </p>
                            <h3 className="font-display text-base font-semibold text-slate-900 mt-0.5">
                              {req.item?.title || 'Campus Item'}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                              {requestSubTab === 'incoming'
                                ? `Requested by ${req.requester?.fullName} (${req.requester?.department})`
                                : `Owner: ${req.owner?.fullName} (${req.owner?.department})`}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {requestSubTab === 'incoming' && req.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRequestAction(req.id, 'Accepted')}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-xs font-semibold"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRequestAction(req.id, 'Rejected')}
                                  className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {requestSubTab === 'incoming' && req.status === 'Accepted' && (
                              <button
                                type="button"
                                onClick={() => handleRequestAction(req.id, 'In Progress')}
                                className="px-3.5 py-1.5 rounded-lg bg-[#6D5CE7] text-white text-xs font-semibold"
                              >
                                Mark Handover In Progress
                              </button>
                            )}
                            {requestSubTab === 'outgoing' && req.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleRequestAction(req.id, 'Cancelled')}
                                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        </div>

                        {req.proposedSwapItem && (
                          <p className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                            Proposed Swap Item: <span className="font-semibold">{req.proposedSwapItem}</span>
                          </p>
                        )}
                        {req.message && (
                          <p className="text-sm text-slate-600">“{req.message}”</p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* MY BORROWINGS & RETURN MANAGEMENT */}
          {activeTab === 'borrowings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div>
                <h1 className="font-display text-xl font-bold text-[#172554]">
                  Active Borrowings & Return Management
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Log handover/return conditions with photos, track return dates, and confirm mutual handover.
                </p>
              </div>

              {activeBorrowings.length === 0 ? (
                <p className="text-sm text-slate-500 py-10 text-center">
                  No active borrowings or pending returns right now.
                </p>
              ) : (
                <div className="space-y-4">
                  {activeBorrowings.map((txn) => {
                    const isBorrower = txn.borrowerId === user.id;
                    const myConfirmed = isBorrower
                      ? txn.borrowerReturnConfirmed
                      : txn.ownerReturnConfirmed;
                    const peerConfirmed = isBorrower
                      ? txn.ownerReturnConfirmed
                      : txn.borrowerReturnConfirmed;

                    return (
                      <div
                        key={txn.id}
                        className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-[#F8FAFC]"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500">
                              {txn.exchangeType} · Role:{' '}
                              <span className="font-semibold text-[#172554]">
                                {isBorrower ? 'Borrower / Recipient' : 'Owner / Lender'}
                              </span>{' '}
                              · Status:{' '}
                              <span className="font-semibold text-[#6D5CE7]">{txn.status}</span>
                            </p>
                            <h3 className="font-display text-base font-bold text-slate-900 mt-1">
                              {txn.item?.title}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1">
                              {isBorrower
                                ? `Owner: ${txn.owner?.fullName}`
                                : `Borrower: ${txn.borrower?.fullName}`}
                            </p>
                          </div>

                          <div className="text-xs font-mono text-slate-600 space-y-1 tabular-nums sm:text-right">
                            <p>Start: {new Date(txn.startDate).toLocaleDateString()}</p>
                            {txn.expectedReturnDate && (
                              <p>
                                Expected Return:{' '}
                                {new Date(txn.expectedReturnDate).toLocaleDateString()}
                              </p>
                            )}
                            {txn.actualReturnDate && (
                              <p>
                                Actual Return:{' '}
                                {new Date(txn.actualReturnDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Condition Reports */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <p className="text-xs font-semibold text-slate-600">
                            Condition Logs ({txn.conditionReports?.length || 0})
                          </p>
                          {txn.conditionReports && txn.conditionReports.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {txn.conditionReports.map((cr) => (
                                <div
                                  key={cr.id}
                                  className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-1.5"
                                >
                                  <p className="font-semibold text-[#172554]">
                                    {cr.stage} · {cr.conditionGrade}
                                  </p>
                                  <p className="text-slate-600">{cr.notes || 'No extra notes.'}</p>
                                  {cr.photoUrls.length > 0 && (
                                    <div className="flex gap-2 pt-1">
                                      {cr.photoUrls.map((url, idx) => (
                                        <div
                                          key={idx}
                                          className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200"
                                        >
                                          <ImageWithFallback
                                            src={url}
                                            alt={`Condition ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              No condition reports logged yet.
                            </p>
                          )}
                        </div>

                        {/* Dual Confirmation Status & Actions */}
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 flex items-center gap-3">
                            <span>
                              You: {myConfirmed ? 'Confirmed' : 'Pending'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Other Party: {peerConfirmed ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setConditionModalTxn(txn);
                                setCondStage(
                                  txn.conditionReports?.some((c) => c.stage === 'Before Handover')
                                    ? 'After Return'
                                    : 'Before Handover'
                                );
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Log Condition
                            </button>

                            {!myConfirmed && (
                              <button
                                type="button"
                                onClick={() => handleConfirmReturn(txn.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-[#14B8A6] hover:bg-[#0d9488] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Confirm Return
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setDisputeTxnId(txn.id);
                                setDisputeItemId(txn.itemId);
                                setDisputeModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 inline-flex items-center gap-1.5"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Report Issue / Dispute
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EXCHANGE HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h1 className="font-display text-xl font-bold text-[#172554]">Exchange History</h1>
              {completedTransactions.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  Completed exchanges will appear here once both parties confirm return/handover.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 pr-4 font-medium">Item</th>
                        <th className="py-2.5 px-4 font-medium">Type</th>
                        <th className="py-2.5 px-4 font-medium">Partner</th>
                        <th className="py-2.5 px-4 font-medium">Started</th>
                        <th className="py-2.5 pl-4 font-medium text-right">Returned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedTransactions.map((t) => {
                        const partner = t.borrowerId === user.id ? t.owner : t.borrower;
                        return (
                          <tr key={t.id}>
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {t.item?.title || 'Item'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{t.exchangeType}</td>
                            <td className="py-3 px-4 text-slate-600">{partner?.fullName}</td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-500 tabular-nums">
                              {new Date(t.startDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 pl-4 font-mono text-xs text-slate-500 text-right tabular-nums">
                              {t.actualReturnDate
                                ? new Date(t.actualReturnDate).toLocaleDateString()
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DAMAGE & DISPUTE REPORTS */}
          {activeTab === 'disputes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#172554]">
                    Damage & Dispute Reporting
                  </h1>
                  <p className="text-sm text-slate-500">
                    Submit neutral reports for damaged, missing, late, or unreturned items for campus admin review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDisputeTxnId('');
                    setDisputeItemId(allItems[0]?.id || '');
                    setDisputeModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#172554] text-white text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <AlertTriangle className="h-4 w-4" />
                  File New Report
                </button>
              </div>

              {disputes.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No dispute reports submitted on your account.
                </p>
              ) : (
                <div className="space-y-4">
                  {disputes.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200 p-5 space-y-3 bg-[#F8FAFC]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#6D5CE7]">
                          {d.category} · Status:{' '}
                          <span className="text-[#172554]">{d.status}</span>
                        </p>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          Submitted {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        {d.item?.title || 'Exchange Item'}
                      </h3>
                      <p className="text-sm text-slate-700">{d.description}</p>

                      {d.photoUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {d.photoUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="w-20 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white"
                            >
                              <ImageWithFallback
                                src={url}
                                alt={`Dispute evidence ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {d.resolutionSummary && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
                          <span className="font-semibold text-[#0F766E]">Admin Resolution: </span>
                          {d.resolutionSummary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MESSAGES */}
          {activeTab === 'messages' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[440px]">
              <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 p-4 space-y-2">
                <h2 className="font-display text-sm font-bold text-[#172554] px-2 pb-2">
                  Campus Conversations
                </h2>
                {peerList.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2">
                    No messages yet. Contact an owner from any item page.
                  </p>
                ) : (
                  peerList.map((peer) => (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => setSelectedPeerId(peer.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${
                        activePeerId === peer.id
                          ? 'bg-[#172554] text-white'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <p className="text-sm font-semibold truncate">{peer.name}</p>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          activePeerId === peer.id ? 'text-white/80' : 'text-slate-500'
                        }`}
                      >
                        {peer.lastMessage.content}
                      </p>
                    </button>
                  ))
                )}
              </div>

              <div className="md:col-span-8 flex flex-col justify-between p-5">
                {activePeerId ? (
                  <>
                    <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                      {activeThread.map((m) => {
                        const mine = m.senderId === user.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                                mine
                                  ? 'bg-[#172554] text-white'
                                  : 'bg-slate-100 text-slate-900'
                              }`}
                            >
                              {m.content}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendReply} className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
                      <input
                        type="text"
                        required
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-[#172554] text-white text-sm font-semibold inline-flex items-center gap-1.5"
                      >
                        <Send className="h-4 w-4" />
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 my-auto text-center">
                    Select a conversation to view messages.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-xl font-bold text-[#172554]">Notifications</h1>
                {unreadNotifCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.markAllNotificationsRead();
                      void loadWorkspace();
                    }}
                    className="text-xs font-semibold text-[#6D5CE7] hover:underline"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No notifications yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`py-4 flex items-start justify-between gap-4 ${
                        n.isRead ? 'opacity-70' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                        <p className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={async () => {
                            await api.markNotificationRead(n.id);
                            void loadWorkspace();
                          }}
                          className="text-xs font-medium text-[#14B8A6] hover:underline whitespace-nowrap"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {profileAvatar ? (
                      <ImageWithFallback
                        src={profileAvatar}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-xl font-bold text-[#172554]">
                        {user.fullName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-bold text-[#172554] flex items-center gap-2">
                      {user.fullName}
                      {user.verificationStatus === 'Verified' && (
                        <ShieldCheck className="h-5 w-5 text-[#14B8A6]" />
                      )}
                    </h1>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {user.studentId} · {user.email} · Verification: {user.verificationStatus}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {myItems.length} listed items · {completedTransactions.length} completed exchanges
                    </p>
                  </div>
                </div>

                <label className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer self-start">
                  Upload Profile Picture
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      required
                      value={profileDept}
                      onChange={(e) => setProfileDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Year of Study
                    </label>
                    <input
                      type="text"
                      required
                      value={profileYear}
                      onChange={(e) => setProfileYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Student Bio & Campus Availability
                  </label>
                  <textarea
                    rows={3}
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Share your preferred campus meetup times and study blocks..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Item Modal */}
      {listingModalOpen && (
        <ListingFormModal
          categories={categories}
          editingItem={editingItem}
          onClose={() => setListingModalOpen(false)}
          onSaved={() => {
            setListingModalOpen(false);
            void loadWorkspace();
          }}
        />
      )}

      {/* Condition Report Modal */}
      {conditionModalTxn && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <h2 className="font-display text-lg font-bold text-[#172554]">
              Submit Condition Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{conditionModalTxn.item?.title}</p>

            <form onSubmit={handleConditionSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Stage</label>
                  <select
                    value={condStage}
                    onChange={(e) => setCondStage(e.target.value as ConditionStage)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="Before Handover">Before Handover</option>
                    <option value="After Return">After Return</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Condition Grade
                  </label>
                  <select
                    value={condGrade}
                    onChange={(e) => setCondGrade(e.target.value as ConditionGrade)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Minor Wear">Minor Wear</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Inspection Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={condNotes}
                  onChange={(e) => setCondNotes(e.target.value)}
                  placeholder="Document physical state, accessories included, or any wear..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supporting Photographs
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => handleUploadPhotos(e.target.files, setCondPhotos)}
                  className="text-xs text-slate-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConditionModalTxn(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#172554] text-white text-sm font-semibold"
                >
                  Save Condition Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Report Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <h2 className="font-display text-lg font-bold text-[#172554]">
              Submit Damage or Dispute Report
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Reports are reviewed neutrally by campus administrators. No automatic charges or blame are applied.
            </p>

            <form onSubmit={handleDisputeSubmit} className="mt-4 space-y-4">
              {!disputeTxnId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Related Item
                  </label>
                  <select
                    value={disputeItemId}
                    onChange={(e) => setDisputeItemId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {allItems.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Report Category
                </label>
                <select
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value as DisputeCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Missing Product">Missing Product</option>
                  <option value="Late Return">Late Return</option>
                  <option value="Unreturned Product">Unreturned Product</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Describe objectively what happened, dates, and handover context..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Supporting Photographs
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={(e) => handleUploadPhotos(e.target.files, setDisputePhotos)}
                  className="text-xs text-slate-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#172554] text-white text-sm font-semibold"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
