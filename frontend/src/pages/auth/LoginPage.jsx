import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import AuthLayout from '../../layouts/AuthLayout';
import { Lock, Mail, User, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial Admin Setup mode
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialSetup = async (e) => {
    e.preventDefault();
    setError('');
    setSetupSuccess('');
    setLoading(true);

    try {
      const data = await authService.setupInitialAdmin({
        name: setupName,
        email,
        password,
        phone: setupPhone,
      });

      setSetupSuccess(
        'Super Admin created successfully! You can now log in.'
      );
      setIsSetupMode(false);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Initial setup failed. Super admin may already exist.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-brand-900">
          {isSetupMode ? 'Initialize Super Admin' : 'Sign in to your account'}
        </h2>
        <p className="mt-1 text-xs text-brand-500">
          {isSetupMode
            ? 'First-time setup for the centralized Zonal Manager account'
            : 'Enter your credentials to access your university dashboard'}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {setupSuccess && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{setupSuccess}</span>
        </div>
      )}

      {!isSetupMode ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-700">
              Email Address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700">
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full justify-center rounded-lg bg-brand-700 py-2.5 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleInitialSetup} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-700">
              Full Name
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Zonal Manager Name"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700">
              Email Address
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@portal.edu"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700">
              Password
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-sm text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700">
              Phone Number (Optional)
            </label>
            <input
              type="text"
              value={setupPhone}
              onChange={(e) => setSetupPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-sm text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full justify-center rounded-lg bg-brand-700 py-2.5 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Creating Administrator...' : 'Create Super Admin'}
          </button>
        </form>
      )}

      {/* Switch between normal login and setup mode */}
      <div className="mt-6 border-t border-brand-100 pt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSetupMode(!isSetupMode);
            setError('');
          }}
          className="text-xs text-brand-600 hover:text-brand-900 hover:underline flex items-center justify-center gap-1.5 mx-auto"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>
            {isSetupMode
              ? 'Back to regular Sign In'
              : 'First time setup? Initialize Super Admin'}
          </span>
        </button>
      </div>
    </AuthLayout>
  );
}
