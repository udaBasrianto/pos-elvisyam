import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard, ColoredCard } from "@/components/ui/colored-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Upload,
  RotateCcw,
  Database,
  Shield,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  HardDrive,
  Lock,
  Eye,
  EyeOff,
  Server,
  Trash2,
  RefreshCcw,
  Cloud
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import api from "@/lib/api";

const Backup = () => {
  const { state, exportData, importData, resetData } = useApp();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMySQL, setIsExportingMySQL] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingMySQL, setIsImportingMySQL] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Server backups state
  const [savedBackups, setSavedBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingToServer, setIsSavingToServer] = useState(false);
  const [isRestoringFromServer, setIsRestoringFromServer] = useState<string | null>(null);
  const [isDeletingFromServer, setIsDeletingFromServer] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedBackups();
  }, []);

  const fetchSavedBackups = async () => {
    try {
      setIsLoadingBackups(true);
      const response = await api.get('/backup/list');
      setSavedBackups(response.data);
    } catch (error) {
      console.error('Failed to fetch saved backups:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSaveToServer = async () => {
    try {
      setIsSavingToServer(true);
      const response = await api.post('/backup/save');
      if (response.data.success) {
        toast({
          title: "Berhasil",
          description: "Backup berhasil disimpan di server",
        });
        fetchSavedBackups();
      }
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.response?.data?.error || "Gagal menyimpan backup ke server",
        variant: "destructive",
      });
    } finally {
      setIsSavingToServer(false);
    }
  };

  const handleRestoreFromServer = async (filename: string) => {
    if (!window.confirm(`Anda yakin ingin merestore database dari file ${filename}? Tindakan ini akan menimpa semua data saat ini!`)) {
      return;
    }

    try {
      setIsRestoringFromServer(filename);
      const response = await api.post(`/backup/restore/saved/${filename}`);
      if (response.data.success) {
        toast({
          title: "Restore Berhasil",
          description: "Database berhasil dipulihkan dari server",
        });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      toast({
        title: "Restore Gagal",
        description: error.response?.data?.details || error.message || "Gagal merestore backup",
        variant: "destructive",
      });
    } finally {
      setIsRestoringFromServer(null);
    }
  };

  const handleDeleteFromServer = async (filename: string) => {
    if (!window.confirm(`Hapus file backup ${filename}?`)) return;

    try {
      setIsDeletingFromServer(filename);
      const response = await api.delete(`/backup/delete/${filename}`);
      if (response.data.success) {
        toast({
          title: "Dihapus",
          description: "File backup berhasil dihapus dari server",
        });
        fetchSavedBackups();
      }
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.response?.data?.error || "Gagal menghapus file",
        variant: "destructive",
      });
    } finally {
      setIsDeletingFromServer(null);
    }
  };

  // Calculate data size from actual state
  const calculateDataSize = () => {
    const dataString = JSON.stringify({
      products: state.products,
      customers: state.customers,
      transactions: state.transactions,
      settings: state.settings,
    });
    return new Blob([dataString]).size;
  };

  // Calculate statistics
  const stats = {
    products: state.products.length,
    customers: state.customers.length,
    transactions: state.transactions.length,
    totalRevenue: state.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.total, 0),
    lastBackup: localStorage.getItem('pos-last-backup-date'),
    dataSize: calculateDataSize()
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Belum pernah';
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const jsonData = exportData();

      // Check if jsonData is valid
      if (!jsonData || jsonData === "" || jsonData === "{}") {
        toast({
          title: "Backup Gagal",
          description: "Tidak ada data untuk dibackup",
          variant: "destructive",
        });
        return;
      }

      // Create filename with date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `pos-backup-${dateStr}_${timeStr}.json`;

      // Try using File System Access API (modern browsers - allows user to choose location)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JSON File',
              accept: { 'application/json': ['.json'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(jsonData);
          await writable.close();

          localStorage.setItem('pos-last-backup-date', now.toISOString());
          toast({
            title: "Backup Berhasil",
            description: `File "${filename}" berhasil disimpan`,
          });
          console.log('Backup saved via File System API:', filename, 'Size:', jsonData.length, 'bytes');
          return;
        } catch (err: any) {
          // User cancelled or API not supported, fall through to traditional download
          if (err.name === 'AbortError') {
            toast({
              title: "Dibatalkan",
              description: "Download backup dibatalkan",
            });
            return;
          }
          console.log('File System API not available, using fallback');
        }
      }

      // Fallback: Traditional blob download
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });

      // Check if browser supports msSaveBlob (IE/Edge legacy)
      if ((navigator as any).msSaveBlob) {
        (navigator as any).msSaveBlob(blob, filename);
      } else {
        // Modern browsers
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = filename;
        link.setAttribute('download', filename);

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }

      // Save backup date
      localStorage.setItem('pos-last-backup-date', now.toISOString());

      toast({
        title: "Backup Berhasil",
        description: `File "${filename}" berhasil didownload. Cek folder Downloads Anda.`,
      });

      console.log('Backup exported:', filename, 'Size:', jsonData.length, 'bytes');

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Backup Gagal",
        description: "Terjadi kesalahan saat mengexport data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export as MySQL dump
  const handleExportMySQL = async () => {
    try {
      setIsExportingMySQL(true);

      const response = await api.get('/backup/mysql');

      if (!response.data.success) {
        throw new Error('Failed to generate MySQL backup');
      }

      const sqlDump = response.data.data;
      const filename = response.data.filename || `pos-backup-${new Date().toISOString().split('T')[0]}.sql`;

      // Try using File System Access API
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'SQL File',
              accept: { 'application/sql': ['.sql'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(sqlDump);
          await writable.close();

          localStorage.setItem('pos-last-backup-date', new Date().toISOString());
          toast({
            title: "Backup MySQL Berhasil",
            description: `File "${filename}" berhasil disimpan. Stats: ${response.data.stats.products} produk, ${response.data.stats.customers} pelanggan, ${response.data.stats.transactions} transaksi.`,
          });
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            toast({ title: "Dibatalkan", description: "Download backup dibatalkan" });
            return;
          }
        }
      }

      // Fallback
      const blob = new Blob([sqlDump], { type: 'application/sql;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      localStorage.setItem('pos-last-backup-date', new Date().toISOString());
      toast({
        title: "Backup MySQL Berhasil",
        description: `File "${filename}" berhasil didownload. Cek folder Downloads Anda.`,
      });

    } catch (error) {
      console.error('MySQL export error:', error);
      toast({
        title: "Backup MySQL Gagal",
        description: "Terjadi kesalahan saat mengexport data ke format MySQL",
        variant: "destructive",
      });
    } finally {
      setIsExportingMySQL(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);

      const text = await file.text();
      const success = await importData(text);

      if (success) {
        toast({
          title: "Import Berhasil",
          description: "Data berhasil diimport dari file backup",
        });
      } else {
        toast({
          title: "Import Gagal",
          description: "Format file tidak valid atau data rusak",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import Gagal",
        description: "Terjadi kesalahan saat membaca file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleImportMySQL = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImportingMySQL(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/backup/restore/mysql', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Increase timeout to 60 seconds for restore
      });

      if (response.data.success) {
        toast({
          title: "Restore MySQL Berhasil",
          description: "Database berhasil dipulihkan dari file SQL",
        });
        // Reload data from backend
        window.location.reload();
      } else {
        throw new Error(response.data.error || 'Failed to restore');
      }
    } catch (error: any) {
      console.error('MySQL restore error:', error);
      toast({
        title: "Restore MySQL Gagal",
        description: error.response?.data?.details || error.message || "Terjadi kesalahan saat merestore database",
        variant: "destructive",
      });
    } finally {
      setIsImportingMySQL(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleResetData = async () => {
    // Open the password confirmation dialog instead of using window.confirm
    setShowResetDialog(true);
    setResetPassword("");
    setPasswordError("");
  };

  // Handle password verification and reset
  const handleConfirmReset = async () => {
    if (!resetPassword.trim()) {
      setPasswordError("Password tidak boleh kosong");
      return;
    }

    setIsVerifying(true);
    setPasswordError("");

    try {
      // Verify password first
      const verifyResponse = await api.post('/auth/verify-password', {
        password: resetPassword
      });

      if (verifyResponse.data.valid) {
        // Password verified, proceed with reset
        setIsVerifying(false);
        setShowResetDialog(false);
        setIsResetting(true);

        try {
          const success = await resetData();

          if (success) {
            toast({
              title: "Reset Berhasil",
              description: "Semua data telah dihapus dari database",
            });
          } else {
            toast({
              title: "Reset Gagal",
              description: "Terjadi kesalahan saat menghapus data",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Reset Gagal",
            description: "Terjadi kesalahan saat menghapus data",
            variant: "destructive",
          });
        } finally {
          setIsResetting(false);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setPasswordError("Password yang Anda masukkan salah");
      } else {
        setPasswordError("Terjadi kesalahan saat memverifikasi password");
      }
    } finally {
      setIsVerifying(false);
      setResetPassword("");
    }
  };

  // Close reset dialog
  const handleCloseResetDialog = () => {
    setShowResetDialog(false);
    setResetPassword("");
    setPasswordError("");
    setShowPassword(false);
  };

  const getBackupStatus = () => {
    if (!stats.lastBackup) {
      return { status: 'none', color: 'destructive', text: 'Belum pernah backup' };
    }

    const lastBackupDate = new Date(stats.lastBackup);
    const daysSinceBackup = Math.floor((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceBackup === 0) {
      return { status: 'current', color: 'success', text: 'Backup hari ini' };
    } else if (daysSinceBackup <= 7) {
      return { status: 'recent', color: 'secondary', text: `${daysSinceBackup} hari lalu` };
    } else {
      return { status: 'old', color: 'warning', text: `${daysSinceBackup} hari lalu` };
    }
  };

  const backupStatus = getBackupStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Backup & Restore</h2>
        <p className="text-muted-foreground">Kelola backup data dan pemulihan sistem</p>
      </div>

      {/* Backup Status Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        <MetricCard
          title="Status Backup"
          value={backupStatus.text}
          icon={Shield}
          iconColor="blue"
        />
        <MetricCard
          title="Ukuran Data"
          value={formatFileSize(stats.dataSize)}
          icon={HardDrive}
          iconColor="purple"
        />
        <MetricCard
          title="Total Records"
          value={(stats.products + stats.customers + stats.transactions).toString()}
          icon={Database}
          iconColor="green"
        />
        <MetricCard
          title="Nilai Data"
          value={formatCurrency(stats.totalRevenue)}
          icon={CheckCircle}
          iconColor="orange"
        />
      </div>

      {/* Data Statistics */}
      <ColoredCard icon={Database} iconColor="blue" title="Statistik Data">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-background rounded-lg border">
            <Database className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-primary">{stats.products}</p>
            <p className="text-sm text-muted-foreground">Produk</p>
          </div>

          <div className="text-center p-4 bg-background rounded-lg border">
            <Database className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-success">{stats.customers}</p>
            <p className="text-sm text-muted-foreground">Pelanggan</p>
          </div>

          <div className="text-center p-4 bg-background rounded-lg border">
            <Database className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-warning">{stats.transactions}</p>
            <p className="text-sm text-muted-foreground">Transaksi</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-background rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Backup Terakhir</p>
              <p className="text-sm text-muted-foreground">{formatDate(stats.lastBackup)}</p>
            </div>
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </ColoredCard>

      {/* Server Backups */}
      <ColoredCard icon={Cloud} iconColor="blue" title="Riwayat Backup di Server">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Simpan status database saat ini ke server untuk dapat di-restore kapan saja dengan cepat.
              <br/>(Maksimal 5 file backup terbaru yang akan disimpan)
            </p>
            <Button 
              onClick={handleSaveToServer} 
              disabled={isSavingToServer}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSavingToServer ? (
                <><Settings className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
              ) : (
                <><Server className="w-4 h-4 mr-2" /> Buat Backup Sekarang</>
              )}
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 p-3 grid grid-cols-12 gap-4 font-medium text-sm">
              <div className="col-span-5">Nama File</div>
              <div className="col-span-3">Tanggal</div>
              <div className="col-span-2">Ukuran</div>
              <div className="col-span-2 text-right">Aksi</div>
            </div>
            
            <div className="divide-y max-h-64 overflow-y-auto">
              {isLoadingBackups ? (
                <div className="p-8 flex justify-center">
                  <Settings className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedBackups.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Belum ada riwayat backup di server
                </div>
              ) : (
                savedBackups.map((backup) => (
                  <div key={backup.filename} className="p-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-muted/20 transition-colors">
                    <div className="col-span-5 font-mono truncate" title={backup.filename}>
                      {backup.filename}
                    </div>
                    <div className="col-span-3 text-muted-foreground">
                      {new Date(backup.createdAt).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div className="col-span-2 text-muted-foreground">
                      {formatFileSize(backup.size)}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                        title="Restore Backup Ini"
                        disabled={isRestoringFromServer === backup.filename || isDeletingFromServer === backup.filename}
                        onClick={() => handleRestoreFromServer(backup.filename)}
                      >
                        {isRestoringFromServer === backup.filename ? (
                          <Settings className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Hapus Backup"
                        disabled={isRestoringFromServer === backup.filename || isDeletingFromServer === backup.filename}
                        onClick={() => handleDeleteFromServer(backup.filename)}
                      >
                        {isDeletingFromServer === backup.filename ? (
                          <Settings className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ColoredCard>

      {/* Backup Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export/Backup */}
        <ColoredCard icon={Download} iconColor="green" title="Backup Data">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export semua data aplikasi ke file JSON untuk disimpan sebagai backup.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Data produk dan inventori</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Data pelanggan</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Riwayat transaksi</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Pengaturan aplikasi</span>
              </div>
            </div>

            <Button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              {isExporting ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  Mengexport...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Backup (JSON)
                </>
              )}
            </Button>

            <Button
              onClick={handleExportMySQL}
              disabled={isExportingMySQL}
              variant="outline"
              className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            >
              {isExportingMySQL ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  Mengexport MySQL...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Download Backup (MySQL .sql)
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Format JSON untuk restore ke aplikasi ini. Format MySQL untuk import ke database langsung.
            </p>
          </div>
        </ColoredCard>

        {/* Import/Restore */}
        <ColoredCard icon={Upload} iconColor="orange" title="Restore Data">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import data dari file backup JSON untuk mengembalikan data aplikasi.
            </p>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Perhatian!</p>
                  <p className="text-muted-foreground">
                    Import akan mengganti semua data yang ada. Pastikan untuk backup data saat ini terlebih dahulu.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Restore via JSON</Label>
                <p className="text-xs text-muted-foreground">
                  Gunakan file .json yang didownload dari menu "Download Backup (JSON)".
                </p>
                <label className="block">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    disabled={isImporting || isImportingMySQL}
                    className="cursor-pointer"
                  />
                </label>

                {isImporting && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Settings className="w-4 h-4 animate-spin" />
                    <span>Sedang mengimport data JSON...</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Restore via MySQL (.sql)</Label>
                <p className="text-xs text-muted-foreground">
                  Gunakan file .sql untuk restore database langsung (lebih cepat untuk data besar).
                </p>
                <label className="block">
                  <Input
                    type="file"
                    accept=".sql"
                    onChange={handleImportMySQL}
                    disabled={isImporting || isImportingMySQL}
                    className="cursor-pointer"
                  />
                </label>

                {isImportingMySQL && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Settings className="w-4 h-4 animate-spin" />
                    <span>Sedang merestore database MySQL...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ColoredCard>
      </div>

      {/* Danger Zone */}
      <Card className="bg-gradient-card border-destructive shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Zona Berbahaya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tindakan di bawah ini akan menghapus semua data dan tidak dapat dibatalkan.
          </p>

          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-destructive">Reset Semua Data</p>
                <p className="text-sm text-muted-foreground">
                  Hapus semua produk, pelanggan, transaksi, dan pengaturan
                </p>
              </div>

              <Button
                variant="destructive"
                onClick={handleResetData}
                disabled={isResetting}
                className="shrink-0"
              >
                {isResetting ? (
                  <>
                    <Settings className="w-4 h-4 mr-2 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Best Practices */}
      <ColoredCard icon={FileText} iconColor="purple" title="Rekomendasi Backup">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-foreground mb-3">Frekuensi Backup</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Harian - untuk bisnis aktif</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Mingguan - untuk bisnis sedang</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Bulanan - untuk backup jangka panjang</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Sebelum update atau perubahan besar</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-3">Penyimpanan Backup</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Simpan di lokasi yang berbeda</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Gunakan cloud storage</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Beri nama file dengan tanggal</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Test restore secara berkala</span>
              </li>
            </ul>
          </div>
        </div>
      </ColoredCard>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={handleCloseResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Konfirmasi Reset Data
            </DialogTitle>
            <DialogDescription className="text-left">
              <div className="space-y-3 mt-2">
                <p className="text-sm text-muted-foreground">
                  Anda akan menghapus <strong>SEMUA</strong> data berikut:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>{stats.products} Produk</li>
                  <li>{stats.customers} Pelanggan</li>
                  <li>{stats.transactions} Transaksi</li>
                  <li>Semua pengaturan aplikasi</li>
                </ul>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Tindakan ini tidak dapat dibatalkan!
                  </p>
                </div>
                <p className="text-sm text-foreground font-medium">
                  Masukkan password Anda untuk melanjutkan:
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password Anda"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isVerifying) {
                      handleConfirmReset();
                    }
                  }}
                  className={passwordError ? "border-destructive pr-10" : "pr-10"}
                  disabled={isVerifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCloseResetDialog}
              disabled={isVerifying}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={isVerifying || !resetPassword.trim()}
            >
              {isVerifying ? (
                <>
                  <Settings className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Ya, Reset Semua Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Backup;