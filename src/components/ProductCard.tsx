import { ArrowRight } from 'lucide-react';
import type { Item } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface ProductCardProps {
  item: Item;
  onViewDetails: (itemId: string) => void;
}

export function formatExchangePrice(item: Item): string {
  if (item.exchangeType === 'Buy' || item.exchangeType === 'Sell') {
    return `₹${item.price.toLocaleString('en-IN')}`;
  }
  if (item.exchangeType === 'Borrow') {
    return item.borrowingDurationDays
      ? `Borrow · ${item.borrowingDurationDays}d`
      : 'Borrow';
  }
  if (item.exchangeType === 'Swap') return 'Swap';
  return 'Free';
}

export function ProductCard({ item, onViewDetails }: ProductCardProps) {
  const coverUrl = item.images[0]?.imageUrl;

  return (
    <article className="group bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onViewDetails(item.id)}
        className="block w-full aspect-[4/3] bg-slate-100 overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5CE7]"
      >
        <ImageWithFallback
          src={coverUrl}
          alt={item.title}
          fallbackTitle={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </button>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 truncate">
          <span className="font-medium text-[#6D5CE7]">
            {item.category?.name || 'Campus Resource'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{item.exchangeType}</span>
          <span aria-hidden="true">·</span>
          <span
            className={
              item.availability === 'Available'
                ? 'text-[#0F766E] font-medium'
                : 'text-amber-700 font-medium'
            }
          >
            {item.availability}
          </span>
        </div>

        <h3 className="font-display text-base font-semibold text-slate-900 leading-snug line-clamp-2 mb-2">
          {item.title}
        </h3>

        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4 flex-1">
          {item.description}
        </p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500 mb-4">
          <span className="truncate">
            {item.condition} · {item.owner?.fullName || 'Verified Student'}
          </span>
          <span className="font-mono font-semibold text-sm text-[#172554] tabular-nums whitespace-nowrap shrink-0">
            {formatExchangePrice(item)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails(item.id)}
          className="w-full py-2.5 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
        >
          <span>View Details</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
