/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import {
  UserPlus,
  Mail,
  Lock,
  Shield,
  KeyRound,
  ArrowRight,
  Film,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { useSite } from '@/components/SiteProvider';
import { ThemeToggle } from '@/components/ThemeToggle';

function VersionDisplay() {
  return null;
}

function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cardKey, setCardKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldShowRegister, setShouldShowRegister] = useState(false);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [disabledReason, setDisabledReason] = useState('');

  const { siteName } = useSite();

  useEffect(() => {
    const checkRegistrationAvailable = async () => {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: '',
            password: '',
            confirmPassword: '',
          }),
        });

        const data = await res.json();

        if (data.error === 'localStorage 模式不支持用户注册') {
          router.replace('/login');
          return;
        }

        if (data.error === '管理员已关闭用户注册功能') {
          setRegistrationDisabled(true);
          setDisabledReason('管理员已关闭用户注册功能');
          setShouldShowRegister(true);
          return;
        }

        setShouldShowRegister(true);
      } catch (error) {
        setShouldShowRegister(true);
      }
    };

    checkRegistrationAvailable();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password || !confirmPassword) {
      setError('请填写完整信息');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
          ...(cardKey ? { cardKey } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setError(null);
        setSuccess('注册成功！正在跳转...');

        const delay = data.needDelay ? 2500 : 1500;

        setTimeout(() => {
          const redirect = searchParams.get('redirect') || '/';
          router.replace(redirect);
        }, delay);
      } else {
        const data = await res.json();
        setError(data.error ?? '注册失败');
      }
    } catch (error) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!shouldShowRegister) {
    return <div>Loading...</div>;
  }

  return (
    <div className='relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 via-purple-950 to-gray-950'>
      <div className='absolute inset-0'>
        <div className='absolute top-20 left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse' />
        <div className='absolute bottom-20 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse' style={{ animationDelay: '1s' }} />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl' style={{ animationDelay: '2s' }} />
      </div>

      <div className='absolute top-6 right-6 z-20'>
        <ThemeToggle />
      </div>

      <div className='relative z-10 w-full max-w-lg px-6'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-2xl shadow-violet-600/30'>
            <UserPlus className='w-10 h-10 text-white' />
          </div>
          <h1 className='text-5xl sm:text-6xl font-bold text-white mb-3 tracking-tight'>
            {siteName}
          </h1>
          <p className='text-xl text-white/50 font-light'>
            创建您的观影账户
          </p>
        </div>

        <div
          className='relative backdrop-blur-2xl bg-black/40 rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl transition-all duration-500 hover:border-violet-500/20'
        >
          <div className='absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-full blur-3xl' />
          <div className='absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-indigo-500/30 to-blue-500/30 rounded-full blur-3xl' style={{ animationDelay: '1s' }} />

          <form onSubmit={handleSubmit} className='space-y-6 relative z-10'>
            <div className='group'>
              <label
                htmlFor='username'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                用户名
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <UserPlus className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='username'
                  type='text'
                  autoComplete='username'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='3-20位字母数字下划线'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                密码
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Lock className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='password'
                  type='password'
                  autoComplete='new-password'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='至少6位字符'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                确认密码
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Shield className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='confirmPassword'
                  type='password'
                  autoComplete='new-password'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='再次输入密码'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label
                htmlFor='cardKey'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                卡密 <span className='text-violet-400'>（可选）</span>
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Sparkles className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='cardKey'
                  type='text'
                  autoComplete='off'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='如有卡密请输入'
                  value={cardKey}
                  onChange={(e) => setCardKey(e.target.value)}
                />
              </div>
              <p className='mt-2 text-xs text-white/40'>
                注册需要绑定卡密才能使用系统功能
              </p>
            </div>

            {error && (
              <div className='flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm'>
                <span className='text-lg'>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className='flex items-center gap-2 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm'>
                <CheckCircle className='h-5 w-5' />
                <span>{success}</span>
              </div>
            )}

            <button
              type='submit'
              disabled={
                !username ||
                !password ||
                !confirmPassword ||
                loading ||
                !!success
              }
              className='group relative inline-flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 py-4 text-base font-semibold text-white shadow-2xl shadow-violet-600/40 transition-all duration-300 hover:shadow-violet-600/60 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-violet-600/40 overflow-hidden'
            >
              <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700' />
              <UserPlus className='h-5 w-5 relative z-10' />
              <span className='relative z-10'>
                {loading
                  ? '注册中...'
                  : success
                    ? '注册成功，正在跳转...'
                    : '立即注册'}
              </span>
            </button>
          </form>

          <div className='mt-8 pt-8 border-t border-white/10 text-center'>
            <p className='text-white/50 text-sm mb-4'>
              已有账户？
            </p>
            <a
              href='/login'
              className='group inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold transition-all duration-300 hover:scale-105'
            >
              <span>立即登录</span>
              <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
            </a>
          </div>
        </div>

        <div className='text-center mt-12 text-white/30 text-sm'>
          <p>© 2025 {siteName} · 致敬观影体验</p>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className='relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-950 via-purple-950 to-gray-950'>
      <div className='absolute inset-0'>
        <div className='absolute top-20 left-20 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse' />
        <div className='absolute bottom-20 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse' style={{ animationDelay: '1s' }} />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl' style={{ animationDelay: '2s' }} />
      </div>

      <div className='absolute top-6 right-6 z-20'>
        <ThemeToggle />
      </div>

      <div className='relative z-10 w-full max-w-lg px-6'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-2xl shadow-violet-600/30'>
            <UserPlus className='w-10 h-10 text-white' />
          </div>
          <h1 className='text-5xl sm:text-6xl font-bold text-white mb-3 tracking-tight'>
            {siteName}
          </h1>
          <p className='text-xl text-white/50 font-light'>
            创建您的观影账户
          </p>
        </div>

        <div
          className='relative backdrop-blur-2xl bg-black/40 rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl transition-all duration-500 hover:border-violet-500/20'
        >
          <div className='absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-violet-500/30 to-purple-500/30 rounded-full blur-3xl' />
          <div className='absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-indigo-500/30 to-blue-500/30 rounded-full blur-3xl' style={{ animationDelay: '1s' }} />

          <form onSubmit={handleSubmit} className='space-y-6 relative z-10'>
            <div className='group'>
              <label
                htmlFor='username'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                用户名
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <UserPlus className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='username'
                  type='text'
                  autoComplete='username'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='3-20位字母数字下划线'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                密码
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Lock className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='password'
                  type='password'
                  autoComplete='new-password'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='至少6位字符'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label
                htmlFor='confirmPassword'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                确认密码
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Shield className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='confirmPassword'
                  type='password'
                  autoComplete='new-password'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='再次输入密码'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className='group'>
              <label
                htmlFor='cardKey'
                className='block text-sm font-medium text-white/80 mb-2'
              >
                卡密 <span className='text-violet-400'>（可选）</span>
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <KeyRound className='h-5 w-5 text-white/40 group-focus-within:text-violet-400 transition-colors' />
                </div>
                <input
                  id='cardKey'
                  type='text'
                  autoComplete='off'
                  className='block w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-white shadow-lg ring-2 ring-transparent focus:ring-violet-500 focus:outline-none focus:bg-white/10 placeholder:text-white/30 transition-all duration-300 text-base'
                  placeholder='如有卡密请输入'
                  value={cardKey}
                  onChange={(e) => setCardKey(e.target.value)}
                />
              </div>
              <p className='mt-2 text-xs text-white/40'>
                💡 注册需要绑定卡密才能使用系统功能
              </p>
            </div>

            {error && (
              <div className='flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm'>
                <span className='text-lg'>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className='flex items-center gap-2 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm'>
                <CheckCircle className='h-5 w-5' />
                <span>{success}</span>
              </div>
            )}

            <button
              type='submit'
              disabled={
                !username ||
                !password ||
                !confirmPassword ||
                loading ||
                !!success
              }
              className='group relative inline-flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 py-4 text-base font-semibold text-white shadow-2xl shadow-violet-600/40 transition-all duration-300 hover:shadow-violet-600/60 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-violet-600/40 overflow-hidden'
            >
              <span className='absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700' />
              <UserPlus className='h-5 w-5 relative z-10' />
              <span className='relative z-10'>
                {loading
                  ? '注册中...'
                  : success
                    ? '注册成功，正在跳转...'
                    : '立即注册'}
              </span>
            </button>
          </form>

          <div className='mt-8 pt-8 border-t border-white/10 text-center'>
            <p className='text-white/50 text-sm mb-4'>
              已有账户？
            </p>
            <a
              href='/login'
              className='group inline-flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-semibold transition-all duration-300 hover:scale-105'
            >
              <span>立即登录</span>
              <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-1' />
            </a>
          </div>
        </div>

        <div className='text-center mt-12 text-white/30 text-sm'>
          <p>© 2025 {siteName} · 极致观影体验</p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageClient />
    </Suspense>
  );
}
