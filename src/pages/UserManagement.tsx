import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/kpi-card";
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Users,
    Mail,
    Calendar,
    Loader2,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Key,
    UserCog,
    Crown,
    Copy,
    CopyCheck,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: "admin" | "manager" | "kasir";
    created_at: string;
    updated_at: string;
}

interface RegistrationToken {
    id: string;
    token: string;
    status: 'unused' | 'used';
    used_by_name?: string;
    created_at: string;
    used_at?: string;
}

const UserManagement = () => {
    const { isSuperAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("semua");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tokens, setTokens] = useState<RegistrationToken[]>([]);
    const [isLoadingTokens, setIsLoadingTokens] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "kasir" as "admin" | "manager" | "kasir",
    });

    const [newPassword, setNewPassword] = useState("");

    const roleOptions = ["semua", "admin", "manager", "kasir"];

    // Fetch users
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/users");
            setUsers(response.data);
        } catch (error: any) {
            console.error("Error fetching users:", error);
            toast.error(error.response?.data?.error || "Gagal mengambil data user");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTokens = async () => {
        setIsLoadingTokens(true);
        try {
            const response = await api.get("/auth/registration-tokens");
            setTokens(response.data);
        } catch (error: any) {
            console.error("Error fetching tokens:", error);
        } finally {
            setIsLoadingTokens(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        if (isSuperAdmin) {
            fetchTokens();
        }
    }, [isSuperAdmin]);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "semua" || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const adminCount = users.filter((user) => user.role === "admin").length;
    const managerCount = users.filter((user) => user.role === "manager").length;
    const kasirCount = users.filter((user) => user.role === "kasir").length;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "admin":
                return (
                    <Badge className="bg-purple-500/20 text-purple-600 border border-purple-300">
                        <Crown className="w-3 h-3 mr-1" />
                        Administrator
                    </Badge>
                );
            case "manager":
                return (
                    <Badge className="bg-blue-500/20 text-blue-600 border border-blue-300">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Manager
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-gray-500/20 text-gray-600 border border-gray-300">
                        <Shield className="w-3 h-3 mr-1" />
                        Kasir
                    </Badge>
                );
        }
    };

    const resetForm = () => {
        setFormData({
            email: "",
            password: "",
            full_name: "",
            role: "kasir",
        });
        setEditingUser(null);
    };

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: "",
            full_name: user.full_name,
            role: user.role,
        });
        setIsDialogOpen(true);
    };

    const openPasswordDialog = (user: User) => {
        setPasswordResetUser(user);
        setNewPassword("");
        setIsPasswordDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, {
                    email: formData.email,
                    full_name: formData.full_name,
                    role: formData.role,
                    password: formData.password ? formData.password : undefined,
                    new_password: formData.password ? formData.password : undefined,
                });
                toast.success("User berhasil diperbarui");
            } else {
                await api.post("/users", formData);
                toast.success("User berhasil ditambahkan");
            }

            setIsDialogOpen(false);
            resetForm();
            fetchUsers();
        } catch (error: any) {
            console.error("Error saving user:", error);
            toast.error(error.response?.data?.error || "Gagal menyimpan user");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!passwordResetUser || !newPassword) return;

        setIsSubmitting(true);
        try {
            await api.post(`/users/${passwordResetUser.id}/reset-password`, {
                newPassword,
                new_password: newPassword,
                password: newPassword,
            });
            toast.success(`Password ${passwordResetUser.full_name} berhasil direset`);
            setIsPasswordDialogOpen(false);
            setPasswordResetUser(null);
            setNewPassword("");
        } catch (error: any) {
            console.error("Error resetting password:", error);
            toast.error(error.response?.data?.error || "Gagal mereset password");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (user: User) => {
        if (
            !confirm(
                `Apakah Anda yakin ingin menghapus user "${user.full_name}"? Semua data terkait akan ikut terhapus.`
            )
        ) {
            return;
        }

        try {
            await api.delete(`/users/${user.id}`);
            toast.success("User berhasil dihapus");
            fetchUsers();
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast.error(error.response?.data?.error || "Gagal menghapus user");
        }
    };

    const handleGenerateToken = async () => {
        setIsSubmitting(true);
        try {
            await api.post("/auth/registration-tokens");
            toast.success("Token registrasi berhasil dibuat");
            fetchTokens();
        } catch (error: any) {
            console.error("Error generating token:", error);
            toast.error("Gagal membuat token");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteToken = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus token ini?")) return;
        try {
            await api.delete(`/auth/registration-tokens/${id}`);
            toast.success("Token berhasil dihapus");
            fetchTokens();
        } catch (error: any) {
            console.error("Error deleting token:", error);
            toast.error("Gagal menghapus token");
        }
    };

    const handleCopyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        setCopiedToken(token);
        toast.success("Token disalin ke clipboard");
        setTimeout(() => setCopiedToken(null), 2000);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Tabs defaultValue="users" className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                    <div className="flex items-center gap-2">
                        <TabsList>
                            <TabsTrigger value="users">Daftar User</TabsTrigger>
                            {isSuperAdmin && <TabsTrigger value="tokens">Token Registrasi</TabsTrigger>}
                        </TabsList>

                        <TabsContent value="users" className="mt-0">
                            <Dialog
                                open={isDialogOpen}
                                onOpenChange={(open) => {
                                    setIsDialogOpen(open);
                                    if (!open) resetForm();
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-primary hover:opacity-90">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Tambah User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingUser ? "Edit User" : "Tambah User Baru"}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <Label htmlFor="full_name">Nama Lengkap</Label>
                                            <Input
                                                id="full_name"
                                                value={formData.full_name}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, full_name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, email: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="password">
                                                {editingUser ? "Password Baru (Opsional)" : "Password"}
                                            </Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, password: e.target.value })
                                                }
                                                required={!editingUser}
                                                minLength={formData.password ? 6 : undefined}
                                                placeholder={editingUser ? "Kosongkan jika tidak ingin mengubah password" : "Minimal 6 karakter"}
                                            />
                                            {editingUser && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Kosongkan jika Anda hanya ingin mengubah nama, email, atau role.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label htmlFor="role">Role</Label>
                                            <Select
                                                value={formData.role}
                                                onValueChange={(value: "admin" | "manager" | "kasir") =>
                                                    setFormData({ ...formData, role: value })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">
                                                        <div className="flex items-center gap-2">
                                                            <Crown className="w-4 h-4 text-purple-500" />
                                                            Administrator
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="manager">
                                                        <div className="flex items-center gap-2">
                                                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                            Manager
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="kasir">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-gray-500" />
                                                            Kasir
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Menyimpan...
                                                </>
                                            ) : editingUser ? (
                                                "Update User"
                                            ) : (
                                                "Tambah User"
                                            )}
                                        </Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </TabsContent>
                        {isSuperAdmin && (
                            <TabsContent value="tokens" className="mt-0">
                                <Button
                                    onClick={handleGenerateToken}
                                    disabled={isSubmitting}
                                    className="bg-gradient-primary hover:opacity-90"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat Token
                                </Button>
                            </TabsContent>
                        )}
                    </div>
                </div>

                <TabsContent value="users" className="space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                        <StatCard
                            title="Total User"
                            value={users.length.toString()}
                            icon={Users}
                            iconColor="blue"
                        />

                        <StatCard
                            title="Administrator"
                            value={adminCount.toString()}
                            icon={Crown}
                            iconColor="purple"
                        />

                        <StatCard
                            title="Manager"
                            value={managerCount.toString()}
                            icon={ShieldCheck}
                            iconColor="green"
                        />

                        <StatCard
                            title="Kasir"
                            value={kasirCount.toString()}
                            icon={Shield}
                            iconColor="orange"
                        />
                    </div>

                    {/* Filters */}
                    <Card className="bg-gradient-card border-0 shadow-md">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        placeholder="Cari user (nama, email)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {roleOptions.map((role) => (
                                        <Button
                                            key={role}
                                            variant={roleFilter === role ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setRoleFilter(role)}
                                            className="capitalize"
                                        >
                                            {role === "semua" ? "Semua" : role}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Users List */}
                    <Card className="bg-gradient-card border-0 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserCog className="w-5 h-5" />
                                Daftar User
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Tidak ada user ditemukan.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredUsers.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center justify-between p-4 bg-background rounded-lg border hover:shadow-md transition-all duration-300 hover:scale-[1.01] hover:border-primary/30"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div
                                                    className={`w-12 h-12 rounded-full flex items-center justify-center ${user.role === "admin"
                                                        ? "bg-purple-100"
                                                        : user.role === "manager"
                                                            ? "bg-blue-100"
                                                            : "bg-gray-100"
                                                        }`}
                                                >
                                                    {user.role === "admin" ? (
                                                        <Crown className="w-6 h-6 text-purple-600" />
                                                    ) : user.role === "manager" ? (
                                                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                                                    ) : (
                                                        <Shield className="w-6 h-6 text-gray-600" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-foreground">
                                                            {user.full_name}
                                                        </h3>
                                                        {getRoleBadge(user.role)}
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            <span className="truncate">{user.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            <span>Bergabung: {formatDate(user.created_at)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                                    onClick={() => openPasswordDialog(user)}
                                                >
                                                    <Key className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(user)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(user)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {isSuperAdmin && (
                    <TabsContent value="tokens" className="space-y-6">
                        <Card className="bg-gradient-card border-0 shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Token Registrasi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingTokens ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : tokens.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Belum ada token registrasi.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tokens.map((token) => (
                                        <div
                                            key={token.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background rounded-lg border hover:shadow-md transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                                <div className={`p-3 rounded-full ${token.status === 'unused' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    <Key className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-lg">{token.token}</span>
                                                        <Badge variant={token.status === 'unused' ? 'default' : 'secondary'}>
                                                            {token.status === 'unused' ? 'Tersedia' : 'Terpakai'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Dibuat: {formatDate(token.created_at)}
                                                        {token.status === 'used' && token.used_by_name && ` • Oleh: ${token.used_by_name}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {token.status === 'unused' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCopyToken(token.token)}
                                                        >
                                                            {copiedToken === token.token ? <CopyCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                            <span className="ml-2">Salin</span>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => handleDeleteToken(token.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                )}
            </Tabs>

            {/* Password Reset Dialog */}
            <Dialog
                open={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
            >
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            Reset Password
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Reset password untuk{" "}
                            <span className="font-semibold text-foreground">
                                {passwordResetUser?.full_name}
                            </span>
                        </p>
                        <div className="space-y-2">
                            <Label>Password Baru</Label>
                            <Input
                                type="password"
                                placeholder="Minimal 6 karakter"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={handlePasswordReset}
                            disabled={isSubmitting || newPassword.length < 6}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagement;
