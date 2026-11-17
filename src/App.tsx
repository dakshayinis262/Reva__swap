import { useCallback, useEffect, useState } from 'react';
import { api } from './lib/api';
import type { Category, Item, PlatformStats } from './types';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar, type AppView } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { MarketplacePage } from './pages/MarketplacePage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { BackendSetupPage } from './pages/BackendSetupPage';

function RevaSwapShell() {
  const [view, setView] = useState<AppView>('landing');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('All');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [backendMode, setBackendMode] = useState<'supabase' | 'local-persistent'>(
    'local-persistent'
  );

  const loadPublicData = useCallback(async () => {
    try {
      const [healthRes, statsRes, catRes, itemsRes] = await Promise.all([
        api.health(),
        api.getStats(),
        api.getCategories(),
        api.getItems(),
      ]);
      setBackendMode(healthRes.mode);
      setStats(statsRes);
      setCategories(catRes.categories);
      setRecentItems(itemsRes.items);
    } catch (err) {
      console.error('Failed to initialize public data:', err);
    }
  }, []);

  useEffect(() => {
    void loadPublicData();
  }, [loadPublicData]);

  const navigate = useCallback(
    (nextView: AppView, sectionId?: string) => {
      setView(nextView);
      if (nextView === 'landing' || nextView === 'marketplace') {
        void loadPublicData();
      }
      if (sectionId) {
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [loadPublicData]
  );

  const handleSelectCategory = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId);
      navigate('marketplace');
    },
    [navigate]
  );

  const handleViewItem = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      navigate('item-detail');
    },
    [navigate]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Navbar currentView={view} onNavigate={navigate} />

      <div className="flex-1">
        {view === 'landing' && (
          <LandingPage
            stats={stats}
            categories={categories}
            recentItems={recentItems}
            backendMode={backendMode}
            onNavigate={navigate}
            onSelectCategory={handleSelectCategory}
            onViewItem={handleViewItem}
          />
        )}

        {view === 'marketplace' && (
          <MarketplacePage
            categories={categories}
            initialCategoryId={selectedCategoryId}
            onViewItem={handleViewItem}
          />
        )}

        {view === 'item-detail' && (
          <ItemDetailPage
            itemId={selectedItemId}
            onBack={() => navigate('marketplace')}
            onNavigate={navigate}
          />
        )}

        {(view === 'login' || view === 'register' || view === 'forgot-password') && (
          <AuthPages mode={view} onNavigate={navigate} />
        )}

        {view === 'dashboard' && (
          <StudentDashboardPage
            categories={categories}
            onNavigate={navigate}
            onViewItem={handleViewItem}
          />
        )}

        {view === 'admin' && <AdminDashboardPage onNavigate={navigate} />}

        {view === 'setup-guide' && (
          <BackendSetupPage onBack={() => navigate('landing')} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RevaSwapShell />
      </AuthProvider>
    </ToastProvider>
  );
}
