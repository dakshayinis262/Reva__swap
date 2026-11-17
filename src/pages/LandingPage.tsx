import {
  ArrowRight,
  BookOpen,
  Cpu,
  Dumbbell,
  FlaskConical,
  Home,
  Package,
  PencilRuler,
  ShieldCheck,
} from 'lucide-react';
import type { Category, Item, PlatformStats } from '../types';
import { ImageWithFallback } from '../components/ImageWithFallback';
import { ProductCard } from '../components/ProductCard';
import type { AppView } from '../components/Navbar';

interface LandingPageProps {
  stats: PlatformStats | null;
  categories: Category[];
  recentItems: Item[];
  backendMode: 'supabase' | 'local-persistent';
  onNavigate: (view: AppView, sectionId?: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onViewItem: (itemId: string) => void;
}

function getCategoryIcon(slug: string) {
  switch (slug) {
    case 'books-notes':
      return BookOpen;
    case 'electronics':
      return Cpu;
    case 'lab-equipment':
      return FlaskConical;
    case 'sports-equipment':
      return Dumbbell;
    case 'stationery':
      return PencilRuler;
    case 'hostel-essentials':
      return Home;
    default:
      return Package;
  }
}

export function LandingPage({
  stats,
  categories,
  recentItems,
  backendMode,
  onNavigate,
  onSelectCategory,
  onViewItem,
}: LandingPageProps) {
  const steps = [
    {
      num: '01.',
      title: 'Create your student account',
      body: 'Sign up with your university email, Student ID, department, and year of study for verified campus access.',
    },
    {
      num: '02.',
      title: 'Explore or list available items',
      body: 'Browse textbooks, calculators, lab kits, and dorm gear or list your unused items to lend, sell, swap, or gift.',
    },
    {
      num: '03.',
      title: 'Send or receive exchange requests',
      body: 'Submit structured borrow durations, swap proposals, or purchase requests without duplicate booking conflicts.',
    },
    {
      num: '04.',
      title: 'Connect and complete the exchange',
      body: 'Meet at campus pickup points, log handover condition photos, and confirm returns with mutual verification.',
    },
  ];

  const benefits = [
    {
      title: 'Save money',
      body: 'Avoid buying full-price textbooks, graphing calculators, and lab tools needed for only a single semester.',
    },
    {
      title: 'Reduce waste',
      body: 'Keep functional electronics, study lamps, kettles, and course kits circulating across graduating cohorts.',
    },
    {
      title: 'Connect with students',
      body: 'Meet peers across departments through verified campus pickup points and direct in-app messaging.',
    },
    {
      title: 'Access affordable resources',
      body: 'Filter immediately by free resources, short-term borrows, fair peer-to-peer swaps, or budget student resale.',
    },
    {
      title: 'Build a sharing community',
      body: 'Condition logs, dual return confirmations, and neutral campus dispute review foster accountable trust.',
    },
  ];

  return (
    <div className="bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wide text-[#6D5CE7] mb-3">
                Exclusive University Resource-Sharing Platform
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#172554] leading-[1.12] text-balance mb-5">
                Your Campus. Your Community. Your Swap.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                Discover a smarter way to share campus essentials. Borrow, lend, buy, sell, and
                swap with fellow students while saving money and reducing waste.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('marketplace')}
                  className="px-6 py-3 rounded-xl bg-[#172554] hover:bg-[#1e3270] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <span>Explore Items</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#172554] text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  Join the Community
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/9] lg:aspect-auto lg:min-h-[360px]">
                <ImageWithFallback
                  src="/src/assets/images/hero_campus_sharing_1794931445267.jpg"
                  alt="University students sharing textbooks, a graphing calculator, and study gear on campus"
                  fallbackTitle="REVA SWAP Campus Sharing"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Live Platform Statistics Strip */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Registered Students</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tabular-nums">
                {stats ? stats.totalStudents : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Campus Listings</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tabular-nums">
                {stats ? stats.totalItems : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Available Resources</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-[#14B8A6] tabular-nums">
                {stats ? stats.availableItems : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Completed Exchanges</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-[#6D5CE7] tabular-nums">
                {stats ? stats.completedExchanges : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
              Browse by Campus Category
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Find semester-specific gear across every department and hostel block.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="text-sm font-semibold text-[#6D5CE7] hover:text-[#5544d6] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>View Full Marketplace</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="text-left p-5 bg-white rounded-2xl border border-slate-200 hover:border-[#6D5CE7]/50 hover:shadow-sm transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 text-[#172554] flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recently Listed Products */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
                Recently Listed on Campus
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Live resources shared by verified students across campus.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('marketplace')}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-[#172554] whitespace-nowrap"
            >
              Explore All Listings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentItems.slice(0, 6).map((item) => (
              <ProductCard key={item.id} item={item} onViewDetails={onViewItem} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
            How REVA SWAP Works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            A transparent four-step workflow designed for safe campus borrowing, swapping, and peer resale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between"
            >
              <div>
                <p className="font-mono text-sm font-semibold text-[#6D5CE7] mb-3">
                  {step.num}
                </p>
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why REVA SWAP? */}
      <section id="why-reva-swap" className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight text-balance">
                Why REVA SWAP?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed">
                Built exclusively for university life, REVA SWAP turns single-semester purchases into
                shared campus assets backed by condition tracking and fair administration.
              </p>
              <div className="mt-6 flex items-center gap-3 text-sm text-slate-700">
                <ShieldCheck className="h-5 w-5 text-[#14B8A6] shrink-0" />
                <span>Verified student IDs, dual return checks, and neutral dispute review.</span>
              </div>
            </div>

            <div className="lg:col-span-7 divide-y divide-slate-200 border border-slate-200 rounded-2xl bg-[#F8FAFC]">
              {benefits.map((b, idx) => (
                <div key={b.title} className="p-5 sm:p-6 flex items-start gap-4">
                  <span className="font-mono text-xs font-semibold text-[#172554] pt-1 tabular-nums">
                    0{idx + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {b.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#172554] text-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
            <div className="md:col-span-2">
              <p className="font-display text-lg font-bold text-white">REVA SWAP</p>
              <p className="text-sm text-slate-300 mt-2 max-w-sm leading-relaxed">
                Your Campus. Your Community. Your Swap. A student-first marketplace for borrowing,
                lending, buying, selling, and swapping campus resources.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-3">Platform</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('marketplace')}
                    className="hover:text-white transition-colors"
                  >
                    Explore Items
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('register')}
                    className="hover:text-white transition-colors"
                  >
                    Student Registration
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="hover:text-white transition-colors"
                  >
                    Student & Admin Login
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-3">Architecture</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate('setup-guide')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Supabase Backend Setup Guide
                  </button>
                </li>
                <li className="text-xs text-slate-400">
                  Active storage:{' '}
                  {backendMode === 'supabase'
                    ? 'Connected Supabase'
                    : 'Local Express Persistent Store'}
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} REVA SWAP Campus Resource Network.</p>
            <p>Built for student affordability, reuse, and community trust.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
