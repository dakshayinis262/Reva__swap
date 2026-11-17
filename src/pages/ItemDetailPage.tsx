import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  MapPin,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Item } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { formatExchangePrice } from '../components/ProductCard';
import type { AppView } from '../components/Navbar';

interface ItemDetailPageProps {
  itemId: string;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export function ItemDetailPage({ itemId, onBack, onNavigate }: ItemDetailPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Request modal
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [proposedSwapItem, setProposedSwapItem] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  // Contact owner modal
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getItem(itemId);
        if (active) {
          setItem(res.item);
          setDurationDays(res.item.borrowingDurationDays || 7);
          setActiveImageIdx(0);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Item not found.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [itemId, showToast]);

  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!user) {
      showToast('Please log in to send an exchange request.', 'info');
      onNavigate('login');
      return;
    }
    setSubmitting(true);
    try {
      await api.createRequest({
        itemId: item.id,
        message: requestMessage,
        proposedSwapItem: item.exchangeType === 'Swap' ? proposedSwapItem : undefined,
        requestedDurationDays: item.exchangeType === 'Borrow' ? durationDays : undefined,
      });
      showToast('Exchange request sent to the owner!', 'success');
      setRequestOpen(false);
      setRequestMessage('');
      setProposedSwapItem('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !item.owner) return;
    if (!user) {
      showToast('Please log in to message the owner.', 'info');
      onNavigate('login');
      return;
    }
    setSubmitting(true);
    try {
      await api.sendMessage({
        receiverId: item.owner.id,
        itemId: item.id,
        content: contactMessage,
      });
      showToast('Message delivered to owner inbox.', 'success');
      setContactOpen(false);
      setContactMessage('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not send message.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="h-5 w-36 bg-slate-200 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 aspect-[4/3] bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-5 h-96 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#172554]">Listing Not Found</h1>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-5 py-2.5 rounded-xl bg-[#172554] text-white text-sm font-medium"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const isOwner = user?.id === item.ownerId;
  const activeImg = item.images[activeImageIdx]?.imageUrl || item.images[0]?.imageUrl;

  const primaryActionLabel =
    item.exchangeType === 'Borrow'
      ? 'Request to Borrow'
      : item.exchangeType === 'Buy' || item.exchangeType === 'Sell'
      ? 'Request to Buy'
      : item.exchangeType === 'Swap'
      ? 'Request to Swap'
      : 'Request Free Resource';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#172554] mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Multi-Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-slate-200">
            <ImageWithFallback
              src={activeImg}
              alt={item.title}
              fallbackTitle={item.title}
              className="w-full h-full object-cover"
            />
          </div>

          {item.images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {item.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-colors ${
                    activeImageIdx === idx ? 'border-[#172554]' : 'border-slate-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <ImageWithFallback
                    src={img.imageUrl}
                    alt={`${item.title} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Description & Terms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#172554]">
              Item Description & Details
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {item.description}
            </p>
            {item.exchangeType === 'Swap' && item.swapPreferences && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  Preferred Swap Items
                </p>
                <p className="text-sm text-slate-800">{item.swapPreferences}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contiguous Purchase / Exchange Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#6D5CE7]">
                {item.category?.name || 'Campus Resource'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{item.condition}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  item.availability === 'Available'
                    ? 'text-[#0F766E] font-semibold'
                    : 'text-amber-700 font-semibold'
                }
              >
                {item.availability}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold text-[#172554] leading-snug">
              {item.title}
            </h1>

            <div className="flex items-baseline justify-between py-3 border-y border-slate-100">
              <span className="text-sm text-slate-500">Exchange Mode</span>
              <span className="font-mono text-xl font-bold text-[#172554] tabular-nums">
                {formatExchangePrice(item)}
              </span>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-[#6D5CE7] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Campus Pickup Location</p>
                  <p className="font-medium text-slate-900">{item.pickupLocation}</p>
                </div>
              </div>

              {item.exchangeType === 'Borrow' && (
                <div className="flex items-start gap-3">
                  <CalendarClock className="h-4 w-4 text-[#14B8A6] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Borrowing Terms</p>
                    <p className="font-medium text-slate-900 tabular-nums">
                      Up to {item.borrowingDurationDays || 7} days · Dual handover & return check
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Owner Information */}
            {item.owner && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Listed By</p>
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    {item.owner.fullName}
                    {item.owner.verificationStatus === 'Verified' && (
                      <ShieldCheck className="h-4 w-4 text-[#14B8A6]" aria-label="Verified student" />
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.owner.department} · {item.owner.yearOfStudy}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons (Only relevant actions shown) */}
            <div className="pt-2 space-y-2.5">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#172554] text-sm font-semibold transition-colors"
                >
                  Manage This Listing in Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={item.availability !== 'Available'}
                    onClick={() => {
                      if (!user) {
                        showToast('Please log in to submit an exchange request.', 'info');
                        onNavigate('login');
                        return;
                      }
                      setRequestOpen(true);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                  >
                    {item.availability === 'Available'
                      ? primaryActionLabel
                      : `Currently ${item.availability}`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        showToast('Please log in to contact the owner.', 'info');
                        onNavigate('login');
                        return;
                      }
                      setContactOpen(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#172554] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contact Owner
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exchange Request Modal */}
      {requestOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <h2 className="font-display text-xl font-bold text-[#172554]">
              {primaryActionLabel}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{item.title}</p>

            <form onSubmit={handleExchangeSubmit} className="mt-5 space-y-4">
              {item.exchangeType === 'Borrow' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Requested Borrow Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={item.borrowingDurationDays || 60}
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm tabular-nums"
                  />
                </div>
              )}

              {item.exchangeType === 'Swap' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Item You Are Offering to Swap
                  </label>
                  <input
                    type="text"
                    required
                    value={proposedSwapItem}
                    onChange={(e) => setProposedSwapItem(e.target.value)}
                    placeholder="e.g. Computer Networks 5th Edition (Tanenbaum)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Message & Pickup Note
                </label>
                <textarea
                  rows={3}
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Share when you can meet at the pickup location..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Sending...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Owner Modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <h2 className="font-display text-xl font-bold text-[#172554]">
              Message {item.owner?.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Regarding: {item.title}</p>

            <form onSubmit={handleContactSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Ask about item condition, availability, or campus meetup time..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
