import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppView =
  | 'landing'
  | 'marketplace'
  | 'item-detail'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'dashboard'
  | 'admin'
  | 'setup-guide';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView, sectionId?: string) => void;
}

export function Navbar({ currentView, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (view: AppView, sectionId?: string) => {
    setMobileOpen(false);
    onNavigate(view, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => handleLink('landing')}
          className="font-display text-lg font-bold tracking-tight text-[#172554] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5CE7] rounded-md px-1"
        >
          REVA SWAP
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => handleLink('landing')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] underline-offset-4 ${
              currentView === 'landing' ? 'text-[#172554] font-semibold underline' : 'hover:underline'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleLink('marketplace')}
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] underline-offset-4 ${
              currentView === 'marketplace' || currentView === 'item-detail'
                ? 'text-[#172554] font-semibold underline'
                : 'hover:underline'
            }`}
          >
            Explore Items
          </button>
          <button
            type="button"
            onClick={() => handleLink('landing', 'how-it-works')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleLink('landing', 'why-reva-swap')}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4"
          >
            About Us
          </button>
        </nav>

        {/* Zone 3: Auth / Workspace actions */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleLink(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="text-sm font-medium text-slate-700 hover:text-[#172554] whitespace-nowrap shrink-0"
              >
                {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  handleLink('landing');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#172554] hover:bg-[#1e3270] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleLink('login')}
                className="text-sm font-medium text-slate-700 hover:text-[#172554] whitespace-nowrap shrink-0"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleLink('register')}
                className="px-4 py-2 text-sm font-medium text-white bg-[#172554] hover:bg-[#1e3270] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleLink('landing')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleLink('marketplace')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Explore Items
          </button>
          <button
            type="button"
            onClick={() => handleLink('landing', 'how-it-works')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleLink('landing', 'why-reva-swap')}
            className="block w-full text-left py-2.5 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            About Us
          </button>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleLink(user.role === 'admin' ? 'admin' : 'dashboard')}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-[#172554] rounded-lg"
                >
                  {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    handleLink('landing');
                  }}
                  className="py-2.5 px-4 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleLink('login')}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-[#172554] border border-slate-200 rounded-lg"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleLink('register')}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-[#172554] rounded-lg"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
