import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Store, Loader2, Mail, Lock, User, Key, ArrowLeft, Send, Sparkles, Play } from 'lucide-react';
import { z } from 'zod';
import api from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
  registrationToken: z.string().min(1, 'Token registrasi diperlukan'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithOtp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Auth flow state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRegistrationToken, setSignupRegistrationToken] = useState('');
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  const [demoInfo, setDemoInfo] = useState<{ enabled: boolean; email: string; password: string; title?: string; description?: string } | null>(null);
  const [branding, setBranding] = useState<{ business_name?: string; business_logo?: string; logo_url?: string; description?: string; auth_background?: string } | null>(null);

  useEffect(() => {
    // Fetch demo info
    api.get('/auth/demo-info').then((res) => {
      if (res.data) setDemoInfo(res.data);
    }).catch((e) => console.error(e));

    // Fetch public store branding & custom auth background
    api.get('/auth/branding').then((res) => {
      if (res.data) setBranding(res.data);
    }).catch(() => {});
  }, []);

  const handleDemoLogin = async () => {
    const email = demoInfo?.email || 'demo@posh.web.id';
    const password = demoInfo?.password || 'password';
    setLoginEmail(email);
    setLoginPassword(password);
    setIsLoading(true);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Masuk sebagai Akun Demo (Sesi 10 Menit)!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Gagal masuk ke Akun Demo');
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    try {
      // Validate inputs
      const normalizedEmail = loginEmail.trim().toLowerCase();
      const normalizedPassword = loginPassword.trim();
      const validated = loginSchema.parse({ email: normalizedEmail, password: normalizedPassword });
      setIsLoading(true);
      
      const result = await signIn(validated.email, validated.password);
      
      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      if (result.requireOtp) {
        setShowOtpInput(true);
        setCountdown(60);
        toast.success('Kode OTP telah dikirim ke email Anda');
        return;
      }

      const navigateUser = () => {
        const savedUserStr = localStorage.getItem('pos_user');
        let userRole = '';
        if (savedUserStr) {
          try { userRole = JSON.parse(savedUserStr)?.role; } catch (e) {}
        }
        if (userRole === 'kasir') {
          navigate('/pos');
        } else {
          navigate('/dashboard');
        }
      };

      toast.success('Login berhasil!');
      navigateUser();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) errors[e.path[0] as string] = e.message; });
        setLoginErrors(errors);
      } else {
        toast.error('Terjadi kesalahan saat login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error('Masukkan kode OTP 6 digit');
    } else {
      setIsLoading(true);
      try {
        const { error } = await signInWithOtp(loginEmail.trim().toLowerCase(), otpCode);
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success('Login berhasil!');
        const savedUserStr = localStorage.getItem('pos_user');
        let userRole = '';
        if (savedUserStr) {
          try { userRole = JSON.parse(savedUserStr)?.role; } catch (e) {}
        }
        if (userRole === 'kasir') {
          navigate('/pos');
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        toast.error('OTP tidak valid');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    try {
      const validated = signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
        registrationToken: signupRegistrationToken
      });
      setIsLoading(true);
      const { error } = await signUp(validated.email, validated.password, validated.fullName, validated.registrationToken);
      if (error) { toast.error(error.message); return; }
      toast.success('Registrasi berhasil!');
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) errors[e.path[0] as string] = e.message; });
        setSignupErrors(errors);
      }
    } finally { setIsLoading(false); }
  };

  const logoSrc = branding?.logo_url || branding?.business_logo || '';
  const storeTitle = branding?.business_name || 'POS System';
  const customBg = branding?.auth_background || '';

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 transition-all duration-700 bg-cover bg-center"
      style={{
        backgroundImage: customBg ? `url("${customBg}")` : undefined,
      }}
    >
      {/* Background Gradient / Vignette Overlay for Crisp Readability */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${
        customBg 
          ? 'bg-slate-950/65 backdrop-blur-[3px]' 
          : 'bg-gradient-to-br from-primary/10 via-background to-secondary/10'
      }`} />

      {/* Top Left Navigation Link */}
      <div className="absolute top-4 left-4 z-20">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Beranda
        </Link>
      </div>

      {/* Main Authentication Glassmorphic Card */}
      <Card className="relative z-10 w-full max-w-md shadow-2xl border-white/15 bg-card/95 dark:bg-slate-900/90 backdrop-blur-xl transition-all duration-300">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 overflow-hidden bg-primary/10">
            {logoSrc ? (
              <img src={logoSrc} alt={storeTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center">
                <Store className="w-8 h-8 text-primary-foreground" />
              </div>
            )}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">{storeTitle}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {branding?.description || 'Kelola bisnis & transaksi kasir dengan mudah'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {!showOtpInput ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="nama@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input"
                        disabled={isLoading}
                      />
                    </div>
                    {loginErrors.email && <p className="text-sm text-destructive">{loginErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input"
                        disabled={isLoading}
                      />
                    </div>
                    {loginErrors.password && <p className="text-sm text-destructive">{loginErrors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full font-bold shadow-md" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : 'Login'}
                  </Button>

                  {demoInfo && demoInfo.enabled !== false && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-300">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                            {demoInfo.title || "Akun Demo Interaktif"}
                          </div>
                          <Badge className="bg-amber-500 text-white text-[10px] uppercase font-bold">
                            Uji Coba 10m
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {demoInfo.description || "Ingin mencoba aplikasi tanpa daftar? Gunakan akun demo di bawah ini."}
                        </p>
                        <div className="bg-background/90 p-2 rounded-lg text-[11px] font-mono flex items-center justify-between border">
                          <span className="text-muted-foreground">Email: <strong className="text-foreground">{demoInfo.email}</strong></span>
                          <span className="text-muted-foreground">Pass: <strong className="text-foreground">{demoInfo.password}</strong></span>
                        </div>
                        <Button
                          type="button"
                          onClick={handleDemoLogin}
                          disabled={isLoading}
                          className="w-full h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-bold shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Masuk sebagai Akun Demo (1-Click Login)
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Kode OTP telah dikirim ke:
                    </p>
                    <p className="font-medium">{loginEmail}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Kode OTP (6 digit)</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="otp-code"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="pl-10 text-center tracking-widest font-mono text-lg"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifikasi...</> : 'Verifikasi OTP'}
                  </Button>

                  <div className="text-center space-y-2">
                    {countdown > 0 ? (
                      <p className="text-xs text-muted-foreground">Kirim ulang dalam {countdown}s</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLogin}
                        className="text-xs text-primary hover:underline"
                        disabled={isLoading}
                      >
                        Kirim Ulang OTP
                      </button>
                    )}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowOtpInput(false)}
                        className="text-sm text-muted-foreground hover:text-primary underline"
                        disabled={isLoading}
                      >
                        Kembali ke Login
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nama Lengkap</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input" disabled={isLoading} />
                  </div>
                  {signupErrors.fullName && <p className="text-sm text-destructive">{signupErrors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" placeholder="nama@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input" disabled={isLoading} />
                  </div>
                  {signupErrors.email && <p className="text-sm text-destructive">{signupErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input" disabled={isLoading} />
                  </div>
                  {signupErrors.password && <p className="text-sm text-destructive">{signupErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Konfirmasi Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input" disabled={isLoading} />
                  </div>
                  {signupErrors.confirmPassword && <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-token">Token Registrasi (Minta ke Admin)</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="signup-token" type="text" placeholder="TOKEN123" value={signupRegistrationToken} onChange={(e) => setSignupRegistrationToken(e.target.value.toUpperCase())} className="pl-10 bg-background text-foreground placeholder:text-muted-foreground border-input" disabled={isLoading} />
                  </div>
                  {signupErrors.registrationToken && <p className="text-sm text-destructive">{signupErrors.registrationToken}</p>}
                </div>

                <Button type="submit" className="w-full font-bold shadow-md" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : 'Daftar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
