import { useEffect, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../lib/api';
import type { Category, Item } from '../types';
import { ProductCard } from '../components/ProductCard';

interface MarketplacePageProps {
  categories: Category[];
  initialCategoryId?: string;
  onViewItem: (itemId: string) => void;
}

const EXCHANGE_TYPES = ['All', 'Borrow', 'Buy', 'Sell', 'Swap', 'Free'] as const;
const CONDITIONS = ['All', 'New', 'Like New', 'Good', 'Fair'] as const;
const AVAILABILITIES = ['All', 'Available', 'Reserved', 'Borrowed'] as const;

export function MarketplacePage({
  categories,
  initialCategoryId = 'All',
  onViewItem,
}: MarketplacePageProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategoryId);
  const [exchangeType, setExchangeType] = useState<string>('All');
  const [condition, setCondition] = useState<string>('All');
  const [availability, setAvailability] = useState<string>('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setCategory(initialCategoryId);
  }, [initialCategoryId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getItems({
          q: search,
          category,
          exchangeType,
          condition,
          availability,
          minPrice,
          maxPrice,
          sort,
        });
        if (active) setItems(res.items);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load marketplace.');
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = setTimeout(() => {
      void load();
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, category, exchangeType, condition, availability, minPrice, maxPrice, sort]);

  const resetFilters = () => {
    setSearch('');
    setCategory('All');
    setExchangeType('All');
    setCondition('All');
    setAvailability('All');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#172554] tracking-tight">
            Campus Marketplace
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Search verified student listings to borrow, buy, sell, swap, or claim for free.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="lg:hidden px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
          <select
            aria-label="Sort listings"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="title_asc">Title: A to Z</option>
          </select>
        </div>
      </div>

      {/* Search + Exchange Type Segmented Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search textbooks, calculators, lab gear, pickup locations..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
            />
          </div>

          <div
            role="group"
            aria-label="Exchange type filter"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto"
          >
            {EXCHANGE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setExchangeType(type)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  exchangeType === type
                    ? 'bg-white text-[#172554] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Filters */}
        <aside
          className={`lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-5 ${
            showFilters ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#172554]">Filter Listings</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-[#6D5CE7] hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Condition</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CONDITIONS.map((cond) => (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setCondition(cond)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left transition-colors ${
                    condition === cond
                      ? 'border-[#172554] bg-[#172554] text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {AVAILABILITIES.map((av) => (
                <option key={av} value={av}>
                  {av === 'All' ? 'All Availability States' : av}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              Price Range (₹)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm tabular-nums"
              />
              <input
                type="number"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm tabular-nums"
              />
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                    <div className="h-5 bg-slate-100 rounded w-5/6" />
                    <div className="h-10 bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                No matching campus listings found
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-5">
                Try clearing your search query or adjusting the category and exchange type filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl bg-[#172554] text-white text-sm font-medium"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
                <span className="tabular-nums">
                  Showing {items.length} {items.length === 1 ? 'listing' : 'listings'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} onViewDetails={onViewItem} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
