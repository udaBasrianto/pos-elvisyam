import { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, User, Phone, MapPin, Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { toast } from 'sonner';

const StoreAuth = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = location.pathname.startsWith('/s/') ? `/s/${slug}` : `/${slug}`;
    const { login, register } = useStoreAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Get redirect path from state or default to store
    const from = (location.state as any)?.from || basePath;

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Register form state
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: ''
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!loginEmail || !loginPassword) {
            toast.error('Email dan password harus diisi');
            return;
        }

        setIsLoading(true);
        const { error } = await login(loginEmail, loginPassword);
        setIsLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Login berhasil!');
            navigate(from, { replace: true });
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!registerData.name || !registerData.email || !registerData.password) {
            toast.error('Nama, email, dan password harus diisi');
            return;
        }

        if (registerData.password.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        if (registerData.password !== registerData.confirmPassword) {
            toast.error('Password tidak sama');
            return;
        }

        setIsLoading(true);
        const { error } = await register({
            name: registerData.name,
            email: registerData.email,
            password: registerData.password,
            phone: registerData.phone || undefined,
            address: registerData.address || undefined
        });
        setIsLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Registrasi berhasil!');
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back button */}
                <Button
                    variant="ghost"
                    className="mb-4"
                    onClick={() => navigate(basePath)}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Toko
                </Button>

                <Card className="shadow-xl">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                            <Store className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold">Toko Online</CardTitle>
                            <CardDescription>Login atau daftar untuk melanjutkan belanja</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="register">Daftar</TabsTrigger>
                            </TabsList>

                            {/* Login Tab */}
                            <TabsContent value="login">
                                <form onSubmit={handleLogin} className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="login-email">Email atau Nomor WhatsApp / Telepon</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="login-email"
                                                type="text"
                                                placeholder="nama@email.com atau 08123456789"
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
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
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            'Login'
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Register Tab */}
                            <TabsContent value="register">
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="register-name">Nama Lengkap *</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="register-name"
                                                type="text"
                                                placeholder="John Doe"
                                                value={registerData.name}
                                                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-email">Email *</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="register-email"
                                                type="email"
                                                placeholder="nama@email.com"
                                                value={registerData.email}
                                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-phone">Nomor Telepon</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="register-phone"
                                                type="tel"
                                                placeholder="08xxxxxxxxxx"
                                                value={registerData.phone}
                                                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-address">Alamat</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <Textarea
                                                id="register-address"
                                                placeholder="Alamat lengkap"
                                                value={registerData.address}
                                                onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                                                className="pl-10 min-h-[60px]"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password">Password *</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="register-password"
                                                type="password"
                                                placeholder="Minimal 6 karakter"
                                                value={registerData.password}
                                                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-confirm">Konfirmasi Password *</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="register-confirm"
                                                type="password"
                                                placeholder="Ulangi password"
                                                value={registerData.confirmPassword}
                                                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                                className="pl-10"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            'Daftar'
                                        )}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StoreAuth;
