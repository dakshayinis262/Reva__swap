import { ArrowLeft, Database, FileCode2, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface BackendSetupPageProps {
  onBack: () => void;
}

export function BackendSetupPage({ onBack }: BackendSetupPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#172554]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#172554]">
            Backend & Supabase Connection Guide
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Transparent status of your REVA SWAP persistence layer and instructions for connecting a live Supabase PostgreSQL project.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 flex items-start gap-3">
          <Database className="h-5 w-5 text-[#6D5CE7] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-[#172554]">
              Current Mode:{' '}
              {isSupabaseConfigured
                ? 'Supabase Credentials Detected'
                : 'Local Express Persistent Store (Demo / MVP Sandbox Mode)'}
            </p>
            <p className="text-slate-600 mt-1">
              Because <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> are not configured in this sandbox, all data is persisted by the Express server in{' '}
              <code className="font-mono text-xs">data/reva-swap.json</code> and uploaded photos are stored in{' '}
              <code className="font-mono text-xs">uploads/</code>.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#172554] flex items-center gap-2">
            <FileCode2 className="h-5 w-5 text-[#14B8A6]" />
            Steps to Connect Production Supabase
          </h2>

          <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700 leading-relaxed">
            <li>
              Create a new project at <span className="font-semibold">supabase.com</span> and copy your Project URL and public Anon Key.
            </li>
            <li>
              Open the Supabase SQL Editor and run the complete schema file included in this repository at{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                supabase/schema.sql
              </code>{' '}
              to provision all 10 relational tables, foreign keys, constraints, and Row Level Security (RLS) policies.
            </li>
            <li>
              In Supabase Storage, create public/authenticated buckets named{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">item-images</code>,{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">evidence-photos</code>, and{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">avatars</code>.
            </li>
            <li>
              Set <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in your environment secrets (never expose the service role key in frontend code).
            </li>
          </ol>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-[#14B8A6]" />
          <span>
            RLS policies in supabase/schema.sql enforce owner-only item edits, participant-only request/transaction access, and admin-only dispute resolution.
          </span>
        </div>
      </div>
    </div>
  );
}
