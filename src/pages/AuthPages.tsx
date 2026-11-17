import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, MailCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { AppView } from '../components/Navbar';

interface AuthPagesProps {
  mode: 'login' | 'register' | 'forgot-password';
  onNavigate: (view: AppView) => void;
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology',
  'Management & Commerce',
  'Architecture & Design',
  'Law & Humanities',
];

const YEARS_OF_STUDY = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];

export function AuthPages({ mode, onNavigate }: AuthPagesProps) {
  const { setSession } = useAuth();
  const { showToast } = useToast();

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Registration state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [yearOfStudy, setYearOfStudy] = useState(YEARS_OF_STUDY[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Email verification step
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);
  const [verifyCodePreview, setVerifyCodePreview] = useState<string | null>(null);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');

  // Forgot / Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetStage, setResetStage] = useState<'request' | 'confirm'>('request');
  const [resetCodePreview, setResetCodePreview] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      setSession(res.token, res.user);
      showToast(`Welcome back, ${res.user.fullName}`, 'success');
      onNavigate(res.user.role === 'admin' ? 'admin' : 'dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setSubmitting(true);
    try {
      const res = await api.login({ email, password: pass });
      setSession(res.token, res.user);
      showToast(`Signed in as ${res.user.fullName}`, 'success');
      onNavigate(res.user.role === 'admin' ? 'admin' : 'dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Login failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.register({
        fullName,
        email: regEmail,
        studentId,
        department,
        yearOfStudy,
        password,
        confirmPassword,
      });
      setPendingVerifyEmail(res.email);
      setVerifyCodePreview(res.verificationCodePreview);
      setVerifyCodeInput(res.verificationCodePreview);
      showToast('Registration saved. Verify your email code to activate your account.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Registration failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVerifyEmail) return;
    setSubmitting(true);
    try {
      const res = await api.verifyEmail({ email: pendingVerifyEmail, code: verifyCodeInput });
      setSession(res.token, res.user);
      showToast('University email verified! Complete your profile details anytime.', 'success');
      onNavigate('dashboard');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Verification failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.forgotPassword(resetEmail);
      setResetCodePreview(res.resetCodePreview);
      setResetCode(res.resetCodePreview);
      setResetStage('confirm');
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not initiate reset.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.resetPassword({
        email: resetEmail,
        code: resetCode,
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      showToast(res.message, 'success');
      setResetStage('request');
      onNavigate('login');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Password reset failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Verification view after registration
  if (pendingVerifyEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white rounded-2xl border border-slate-200 p-7">
          <div className="h-11 w-11 rounded-xl bg-[#14B8A6]/10 text-[#0F766E] flex items-center justify-center mb-4">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#172554]">
            Verify Your University Email
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Enter the 6-digit verification code sent to{' '}
            <span className="font-semibold text-slate-900">{pendingVerifyEmail}</span>.
          </p>

          {verifyCodePreview && (
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              Local MVP verification code preview:{' '}
              <span className="font-mono font-bold text-[#172554]">{verifyCodePreview}</span>
            </div>
          )}

          <form onSubmit={handleVerifyEmail} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                required
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Verifying...' : 'Verify Email & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (mode === 'forgot-password') {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#172554] mb-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-7">
          <div className="h-11 w-11 rounded-xl bg-[#6D5CE7]/10 text-[#6D5CE7] flex items-center justify-center mb-4">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#172554]">
            {resetStage === 'request' ? 'Forgot Password' : 'Set New Password'}
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            {resetStage === 'request'
              ? 'Enter your registered university email to receive a 6-digit password reset code.'
              : 'Enter your reset code and choose a strong new password.'}
          </p>

          {resetStage === 'request' ? (
            <form onSubmit={handleRequestReset} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  University Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="student@reva.edu.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold"
              >
                {submitting ? 'Sending Reset Code...' : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              {resetCodePreview && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  Local MVP reset code:{' '}
                  <span className="font-mono font-bold text-[#172554]">{resetCodePreview}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reset Code
                </label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold"
              >
                {submitting ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-[#172554]">
            Create Your REVA SWAP Student Account
          </h1>
          <p className="text-sm text-slate-600 mt-1.5">
            Join your verified campus sharing community to borrow, lend, buy, sell, and swap essentials.
          </p>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kavya Reddy"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Student ID
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. R24CS102"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                University Email
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="name@reva.edu.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Year of Study
                </label>
                <select
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                >
                  {YEARS_OF_STUDY.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Creating Account...' : 'Create Student Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-semibold text-[#6D5CE7] hover:underline"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Login Mode
  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[#172554]">
          Sign In to REVA SWAP
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          Access your student dashboard, exchange requests, and campus listings.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              University Email
            </label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="aarav.sharma@reva.edu.in"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs font-medium text-[#6D5CE7] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5CE7]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-[#172554] hover:bg-[#1e3270] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {submitting ? 'Signing In...' : 'Login'}
          </button>
        </form>

        {/* Quick Demo Access for MVP Testing */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-3">
            Quick MVP Demo Accounts
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => quickLogin('aarav.sharma@reva.edu.in', 'Student@123')}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-colors"
            >
              <p className="text-xs font-semibold text-[#172554] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#14B8A6]" />
                Student Demo
              </p>
              <p className="text-[11px] text-slate-500 truncate">aarav.sharma@reva.edu.in</p>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin@reva.edu.in', 'Admin@123')}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-colors"
            >
              <p className="text-xs font-semibold text-[#6D5CE7] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#6D5CE7]" />
                Admin Demo
              </p>
              <p className="text-[11px] text-slate-500 truncate">admin@reva.edu.in</p>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to REVA SWAP?{' '}
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="font-semibold text-[#6D5CE7] hover:underline"
          >
            Create student account
          </button>
        </p>
      </div>
    </div>
  );
}
