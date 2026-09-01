import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import {
  MessageSquare,
  Plus,
  Send,
  X,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface Reply {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  message: string;
  created_at: string;
}

interface Discussion {
  id: string;
  tenant_name?: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  replies?: Reply[];
}

export default function Discussions() {
  const { user, isSuperAdmin } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const [activeDiscussion, setActiveDiscussion] = useState<Discussion | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/discussions');
      setDiscussions(res.data);
    } catch (error) {
      toast.error('Gagal mengambil daftar keluhan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscussions();
  }, []);

  useEffect(() => {
    if (activeDiscussion) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeDiscussion?.replies]);

  const loadDiscussionDetail = async (id: string) => {
    try {
      const res = await api.get(`/discussions/${id}`);
      setActiveDiscussion(res.data);
    } catch (error) {
      toast.error('Gagal memuat detail diskusi');
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Judul dan pesan tidak boleh kosong');
      return;
    }
    try {
      await api.post('/discussions', { subject: newSubject, message: newMessage });
      toast.success('Keluhan berhasil dikirim');
      setIsNewDialogOpen(false);
      setNewSubject("");
      setNewMessage("");
      fetchDiscussions();
    } catch (error) {
      toast.error('Gagal mengirim keluhan');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !activeDiscussion) return;
    try {
      await api.post(`/discussions/${activeDiscussion.id}/replies`, { message: replyMessage });
      setReplyMessage("");
      await loadDiscussionDetail(activeDiscussion.id);
      fetchDiscussions(); // resync updated_at
    } catch (error) {
      toast.error('Gagal mengirim balasan');
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      await api.put(`/discussions/${id}/status`, { status: 'closed' });
      toast.success('Tiket ditutup');
      if (activeDiscussion?.id === id) {
        await loadDiscussionDetail(id);
      }
      fetchDiscussions();
    } catch (error) {
      toast.error('Gagal mengambil tindakan');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card p-5 rounded-2xl border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Pusat Diskusi & Bantuan</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {isSuperAdmin 
              ? "Kelola semua pertanyaan dan keluhan dari para tenant toko." 
              : "Sampaikan pertanyaan, kendala, atau feedback Anda kepada Pusat Support POS."}
          </p>
        </div>
        {!isSuperAdmin && (
          <Button onClick={() => setIsNewDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-md shrink-0">
            <Plus className="w-4 h-4" />
            Buat Tiket Baru
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : discussions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
            <h3 className="text-lg font-medium text-foreground">Belum ada tiket diskusi</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tiket keluhan atau bantuan akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {discussions.map((d) => (
              <div 
                key={d.id} 
                onClick={() => loadDiscussionDetail(d.id)}
                className="p-4 sm:p-6 hover:bg-muted/50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base sm:text-lg text-foreground">{d.subject}</h3>
                    <Badge variant={d.status === "open" ? "default" : "secondary"} className="rounded-full px-2 text-xs">
                      {d.status === "open" ? (
                        <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Terbuka</span>
                      ) : (
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Selesai</span>
                      )}
                    </Badge>
                  </div>
                  {isSuperAdmin && (
                    <p className="text-sm font-medium text-primary">Toko: {d.tenant_name}</p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-1">{d.message}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(d.updated_at), 'dd MMM yyyy, HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Discussion Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Sampaikan Keluhan/Pertanyaan Baru</DialogTitle>
            <DialogDescription className="sr-only">Formulir isian untuk tiket keluhan baru.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Topik / Judul</label>
              <Input 
                placeholder="Contoh: Fitur Laporan Error" 
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Pesan</label>
              <Textarea 
                placeholder="Deskripsikan masalah Anda di sini..." 
                rows={5}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleCreateDiscussion} className="w-full sm:w-auto">Kirim Tiket</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discussion Chat Detail Dialog */}
      <Dialog open={!!activeDiscussion} onOpenChange={(open) => !open && setActiveDiscussion(null)}>
        <DialogContent className="sm:max-w-[650px] h-[85vh] p-0 flex flex-col overflow-hidden bg-background border rounded-2xl shadow-2xl">
          <DialogTitle className="sr-only">Detail Chat Keluhan</DialogTitle>
          <DialogDescription className="sr-only">Histori percakapan tiket keluhan.</DialogDescription>
          <div className="bg-card border-b px-6 py-4 flex items-center justify-between shadow-xs z-10">
            <div>
              <h3 className="font-bold text-base sm:text-lg text-foreground">{activeDiscussion?.subject}</h3>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {activeDiscussion?.status === 'open' ? (
                  <span className="text-blue-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Menunggu Tanggapan</span>
                ) : (
                   <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Tiket Selesai</span>
                )}
              </p>
            </div>
            {activeDiscussion?.status === 'open' && (
              <Button variant="outline" size="sm" onClick={() => handleCloseTicket(activeDiscussion.id)} className="text-xs">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500" />
                Tutup Tiket
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial Message */}
            {activeDiscussion && (
              <div className="flex flex-col items-start w-full">
                <div className="flex flex-col bg-card border border-border shadow-xs p-4 rounded-2xl rounded-tl-sm max-w-[85%] self-start relative">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-foreground">
                         {isSuperAdmin ? activeDiscussion.tenant_name : 'Anda'}
                      </span>
                   </div>
                   <p className="text-sm whitespace-pre-wrap text-foreground/90">{activeDiscussion.message}</p>
                   <span className="text-[10px] text-muted-foreground mt-2 text-right">
                     {format(new Date(activeDiscussion.created_at), 'dd MMM yyyy HH:mm')}
                   </span>
                </div>
              </div>
            )}

            {/* Replies */}
            {activeDiscussion?.replies?.map((reply) => {
              const isMe = reply.user_id === user?.id;
              const isSuperAdminReply = reply.user_role === 'super_admin';
              
              return (
                <div key={reply.id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex flex-col p-3 max-w-[85%] shadow-xs ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
                      : isSuperAdminReply 
                        ? 'bg-amber-500/10 border border-amber-500/20 text-foreground rounded-2xl rounded-tl-sm' 
                        : 'bg-card border border-border text-foreground rounded-2xl rounded-tl-sm'
                  }`}>
                    {!isMe && (
                      <span className={`text-[11px] font-bold mb-1 ${isSuperAdminReply ? 'text-amber-500' : 'text-foreground'}`}>
                        {reply.user_name} {isSuperAdminReply && '(Pusat)'}
                      </span>
                    )}
                    <p className={`text-sm whitespace-pre-wrap ${isMe ? 'text-primary-foreground' : 'text-foreground/90'}`}>
                      {reply.message}
                    </p>
                    <span className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {format(new Date(reply.created_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          {activeDiscussion?.status === 'open' && (
            <div className="bg-card p-4 border-t shadow-lg z-10 flex gap-2 items-end">
              <Textarea 
                placeholder="Ketik balasan Anda di sini..." 
                className="resize-none border-border focus-visible:ring-1 bg-muted/40 flex-1 min-h-[44px] max-h-[120px] text-sm"
                rows={1}
                value={replyMessage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                onChange={e => setReplyMessage(e.target.value)}
              />
              <Button 
                onClick={handleSendReply} 
                disabled={!replyMessage.trim()}
                className="h-[44px] w-[44px] rounded-xl p-0 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          )}
          {activeDiscussion?.status === 'closed' && (
            <div className="bg-muted/50 p-4 border-t text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Diskusi ini telah ditutup.
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
