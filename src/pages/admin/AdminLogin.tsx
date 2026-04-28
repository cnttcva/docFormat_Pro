// File: src/pages/admin/AdminLogin.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  KeyRound,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Mail,
  Loader2,
} from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';

const ADMIN_EMAILS = [
  'laicaodang@thcscva.edu.vn',
  'danglaicao@gmail.com',
];

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@docformatpro.vn');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const normalizeEmail = (value: string) => {
    return String(value || '').trim().toLowerCase();
  };

  const getErrorMessage = (code?: string) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Email không hợp lệ.';
      case 'auth/user-disabled':
        return 'Tài khoản Admin này đã bị vô hiệu hóa.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email hoặc mật khẩu không đúng.';
      case 'auth/too-many-requests':
        return 'Bạn nhập sai quá nhiều lần. Vui lòng thử lại sau.';
      case 'auth/network-request-failed':
        return 'Không thể kết nối Firebase. Vui lòng kiểm tra mạng.';
      default:
        return 'Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError('Vui lòng nhập email Admin.');
      return;
    }

    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu Admin.');
      return;
    }

    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      setError('Email này không nằm trong danh sách Admin được phép truy cập.');
      setPassword('');
      return;
    }

    setIsLoggingIn(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      const signedInEmail = normalizeEmail(userCredential.user.email || '');

      if (!ADMIN_EMAILS.includes(signedInEmail)) {
        await auth.signOut();
        setError('Tài khoản này không có quyền Admin.');
        setPassword('');
        return;
      }

      sessionStorage.setItem('isAdminAuth', 'true');
      sessionStorage.setItem('adminEmail', signedInEmail);

      navigate('/admin');
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(getErrorMessage(err?.code));
      setPassword('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-300/30 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-300/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] p-10 max-w-md w-full relative z-10 animate-fadeIn">
        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 bg-indigo-100 rounded-full blur animate-pulse" />
          <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-white rounded-[2rem] border border-indigo-100 flex items-center justify-center shadow-inner relative z-10">
            <ShieldCheck className="w-10 h-10 text-indigo-600" />
            <Sparkles className="w-5 h-5 text-purple-400 absolute top-3 right-3" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
            DOCADMIN
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Trung tâm điều hành nền tảng AI
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className={`w-full pl-12 pr-4 py-4 bg-slate-50/50 border ${
                  error
                    ? 'border-rose-400 focus:ring-rose-400/20'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                } rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400`}
                placeholder="Email Admin..."
                autoFocus
              />
            </div>
          </div>

          <div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>

              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className={`w-full pl-12 pr-4 py-4 bg-slate-50/50 border ${
                  error
                    ? 'border-rose-400 focus:ring-rose-400/20'
                    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20'
                } rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400`}
                placeholder="Mật khẩu Firebase Auth..."
              />
            </div>

            {error && (
              <p className="mt-3 text-xs font-bold text-rose-500 flex items-center gap-1.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold transition-all shadow-[0_8px_20px_rgb(99,102,241,0.3)] hover:shadow-[0_8px_25px_rgb(99,102,241,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                ĐANG XÁC THỰC...
              </>
            ) : (
              <>
                MỞ KHÓA HỆ THỐNG <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
          <p className="text-xs text-indigo-700 font-semibold leading-5">
            Tài khoản Admin phải được tạo trong Firebase Authentication. Không dùng mật khẩu hard-code trong source code nữa.
          </p>
        </div>
      </div>
    </div>
  );
}