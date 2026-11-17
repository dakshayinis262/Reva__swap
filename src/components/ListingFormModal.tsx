import React, { useState } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import type {
  Category,
  ExchangeType,
  Item,
  ItemAvailability,
  ItemCondition,
} from '../types';
import { useToast } from '../context/ToastContext';
import { ImageWithFallback } from './ImageWithFallback';

interface ListingFormModalProps {
  categories: Category[];
  editingItem?: Item | null;
  onClose: () => void;
  onSaved: (item: Item) => void;
}

const CONDITIONS: ItemCondition[] = ['New', 'Like New', 'Good', 'Fair'];
const EXCHANGE_TYPES: ExchangeType[] = ['Borrow', 'Buy', 'Sell', 'Swap', 'Free'];
const AVAILABILITIES: ItemAvailability[] = ['Available', 'Reserved', 'Borrowed', 'Unavailable'];

export function ListingFormModal({
  categories,
  editingItem,
  onClose,
  onSaved,
}: ListingFormModalProps) {
  const { showToast } = useToast();

  const [title, setTitle] = useState(editingItem?.title || '');
  const [categoryId, setCategoryId] = useState(
    editingItem?.categoryId || categories[0]?.id || ''
  );
  const [description, setDescription] = useState(editingItem?.description || '');
  const [condition, setCondition] = useState<ItemCondition>(editingItem?.condition || 'Like New');
  const [exchangeType, setExchangeType] = useState<ExchangeType>(
    editingItem?.exchangeType || 'Borrow'
  );
  const [price, setPrice] = useState(editingItem ? String(editingItem.price) : '0');
  const [borrowingDurationDays, setBorrowingDurationDays] = useState(
    editingItem?.borrowingDurationDays ? String(editingItem.borrowingDurationDays) : '7'
  );
  const [availability, setAvailability] = useState<ItemAvailability>(
    editingItem?.availability || 'Available'
  );
  const [pickupLocation, setPickupLocation] = useState(editingItem?.pickupLocation || '');
  const [swapPreferences, setSwapPreferences] = useState(editingItem?.swapPreferences || '');
  const [imageUrls, setImageUrls] = useState<string[]>(
    editingItem?.images.map((i) => i.imageUrl) || []
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, 5)) {
        const url = await api.uploadImage(file);
        uploaded.push(url);
      }
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 5));
      showToast(`Uploaded ${uploaded.length} image(s).`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      showToast('Item name must be at least 3 characters.', 'error');
      return;
    }
    if (description.trim().length < 10) {
      showToast('Please provide at least 10 characters of description.', 'error');
      return;
    }
    if ((exchangeType === 'Buy' || exchangeType === 'Sell') && Number(price) <= 0) {
      showToast('Price must be greater than ₹0 for Buy/Sell listings.', 'error');
      return;
    }
    if (pickupLocation.trim().length < 3) {
      showToast('Please enter a campus pickup location.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        categoryId,
        description: description.trim(),
        condition,
        exchangeType,
        price: exchangeType === 'Buy' || exchangeType === 'Sell' ? Number(price) : 0,
        borrowingDurationDays:
          exchangeType === 'Borrow' ? Math.max(1, Number(borrowingDurationDays)) : null,
        availability,
        pickupLocation: pickupLocation.trim(),
        swapPreferences: exchangeType === 'Swap' ? swapPreferences.trim() : '',
        imageUrls,
      };

      const res = editingItem
        ? await api.updateItem(editingItem.id, payload)
        : await api.createItem(payload);

      showToast(
        editingItem ? 'Listing updated successfully.' : 'New campus listing published!',
        'success'
      );
      onSaved(res.item);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save listing.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-7 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-xl font-bold text-[#172554]">
              {editingItem ? 'Edit Listing' : 'Add New Campus Listing'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share textbooks, calculators, lab gear, or hostel essentials with peers.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Item Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio fx-991EX Classwiz Scientific Calculator"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Item Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Exchange Type
              </label>
              <select
                value={exchangeType}
                onChange={(e) => setExchangeType(e.target.value as ExchangeType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {EXCHANGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {(exchangeType === 'Buy' || exchangeType === 'Sell') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Price (₹)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm tabular-nums"
                />
              </div>
            )}

            {exchangeType === 'Borrow' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Borrow Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  required
                  value={borrowingDurationDays}
                  onChange={(e) => setBorrowingDurationDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm tabular-nums"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Availability
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as ItemAvailability)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {AVAILABILITIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {exchangeType === 'Swap' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Preferred Items to Swap For
              </label>
              <input
                type="text"
                value={swapPreferences}
                onChange={(e) => setSwapPreferences(e.target.value)}
                placeholder="e.g. Data Structures textbook, Arduino kit, or study lamp"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Campus Pickup Location
            </label>
            <input
              type="text"
              required
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="e.g. Central Library Lobby / Boys Hostel Block B Gate"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe item condition, edition/specs, and included accessories..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          {/* Multi-image Upload & Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Product Images (up to 5)
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-[#6D5CE7] rounded-xl p-4 cursor-pointer bg-slate-50 transition-colors">
              <ImagePlus className="h-5 w-5 text-[#6D5CE7]" />
              <span className="text-sm font-medium text-slate-700">
                {uploading ? 'Uploading images...' : 'Click to upload product photos (PNG, JPG, WEBP)'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFilesSelected}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {imageUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-3">
                {imageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                  >
                    <ImageWithFallback
                      src={url}
                      alt={`Uploaded preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-white/90 text-red-600 hover:bg-white shadow-xs"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold"
            >
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
