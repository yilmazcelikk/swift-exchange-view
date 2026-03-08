import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculatePnl, calculateMargin, calculateCommission } from "@/lib/trading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, X, RefreshCw, Eye, Settings, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, Ban, ShieldCheck, ShieldAlert, Target } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  balance: number;
  credit: number;
  equity: number;
  free_margin: number;
  leverage: string;
  verification_status: string;
  meta_id: number;
  created_at: string;
  is_banned: boolean;
  ban_reason: string | null;
  ban_type: string;
  referral_code: string | null;
}

interface OrderRow {
  id: string;
  symbol_name: string;
  type: string;
  lots: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  leverage: string;
  stop_loss: number | null;
  take_profit: number | null;
}

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState<OrderRow[]>([]);
  const [allUserOrders, setAllUserOrders] = useState<any[]>([]);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAllOrders, setLoadingAllOrders] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    balance: "",
    credit: "",
    leverage: "",
    verification_status: "",
    full_name: "",
    phone: "",
    country: "",
    birth_date: "",
  });
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [orderEditForm, setOrderEditForm] = useState({
    entry_price: "",
    lots: "",
    stop_loss: "",
    take_profit: "",
    pnl: "",
    type: "buy" as "buy" | "sell",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 25;

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadUserOrders = useCallback(async (userId: string) => {
    setLoadingOrders(true);
    try {
      // Fetch open orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, symbol_name, type, lots, entry_price, current_price, pnl, leverage, symbol_id, stop_loss, take_profit")
        .eq("user_id", userId)
        .eq("status", "open");

      if (ordersData && ordersData.length > 0) {
        // Fetch live prices for symbols
        const symbolIds = [...new Set(ordersData.map(o => (o as any).symbol_id).filter(Boolean))];
        const { data: symbolsData } = await supabase
          .from("symbols")
          .select("id, current_price")
          .in("id", symbolIds);
        const priceMap = new Map((symbolsData ?? []).map(s => [s.id, Number(s.current_price)]));

        const enriched = ordersData.map(o => {
          const livePrice = priceMap.get((o as any).symbol_id) || Number(o.current_price);
          const pnl = calculatePnl(o.symbol_name, o.type as "buy" | "sell", Number(o.lots), Number(o.entry_price), livePrice);
          return { ...o, current_price: livePrice, pnl } as OrderRow;
        });
        setSelectedUserOrders(enriched);
      } else {
        setSelectedUserOrders([]);
      }
    } catch (err) {
      console.error("loadUserOrders error:", err);
    }
    setLoadingOrders(false);
  }, []);

  // Real-time polling for selected user's orders
  useEffect(() => {
    if (selectedUser) {
      loadUserOrders(selectedUser.user_id);
      const interval = setInterval(() => {
        loadUserOrders(selectedUser.user_id);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setSelectedUserOrders([]);
    }
  }, [selectedUser, loadUserOrders]);

  // Real-time polling for profiles list
  useEffect(() => {
    const interval = setInterval(() => {
      loadProfiles();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.toLowerCase().includes(search.toLowerCase()) ||
      String(p.meta_id).includes(search)
  );

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openEdit = (profile: Profile) => {
    setEditingUser(profile);
    setEditForm({
      balance: profile.balance.toString(),
      credit: profile.credit.toString(),
      leverage: profile.leverage,
      verification_status: profile.verification_status,
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    const newBalance = parseFloat(editForm.balance) || 0;
    const newCredit = parseFloat(editForm.credit) || 0;
    
    // Fetch current open PnL to calculate equity correctly
    const { data: openOrders } = await supabase
      .from("orders")
      .select("pnl")
      .eq("user_id", editingUser.user_id)
      .eq("status", "open");
    
    const openPnl = (openOrders || []).reduce((sum, o) => sum + Number(o.pnl), 0);
    const newEquity = newBalance + newCredit + openPnl;
    
    // Calculate used margin from open orders
    const { data: marginOrders } = await supabase
      .from("orders")
      .select("lots, entry_price, leverage, symbol_name")
      .eq("user_id", editingUser.user_id)
      .eq("status", "open");
    
    let usedMargin = 0;
    if (marginOrders) {
      for (const o of marginOrders) {
        usedMargin += calculateMargin((o as any).symbol_name || "", Number(o.lots), Number(o.entry_price), 200);
      }
    }
    const newFreeMargin = newEquity - usedMargin;

    const { error } = await supabase
      .from("profiles")
      .update({
        balance: newBalance,
        credit: newCredit,
        equity: newEquity,
        free_margin: newFreeMargin,
        leverage: editForm.leverage,
        verification_status: editForm.verification_status,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success("Kullanıcı güncellendi");
      setEditingUser(null);
      loadProfiles();
      if (selectedUser?.id === editingUser.id) {
        setSelectedUser(null);
      }
    }
  };

  const openOrderEdit = (order: OrderRow) => {
    setEditingOrder(order);
    setOrderEditForm({
      entry_price: String(order.entry_price),
      lots: String(order.lots),
      stop_loss: order.stop_loss ? String(order.stop_loss) : "",
      take_profit: order.take_profit ? String(order.take_profit) : "",
      pnl: String(order.pnl),
      type: order.type as "buy" | "sell",
    });
  };

  const handleOrderSave = async () => {
    if (!editingOrder) return;
    const { error } = await supabase
      .from("orders")
      .update({
        entry_price: parseFloat(orderEditForm.entry_price) || editingOrder.entry_price,
        lots: parseFloat(orderEditForm.lots) || editingOrder.lots,
        stop_loss: orderEditForm.stop_loss ? parseFloat(orderEditForm.stop_loss) : null,
        take_profit: orderEditForm.take_profit ? parseFloat(orderEditForm.take_profit) : null,
        pnl: parseFloat(orderEditForm.pnl) || 0,
        type: orderEditForm.type,
      })
      .eq("id", editingOrder.id);
    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success("İşlem güncellendi");
      setEditingOrder(null);
      if (selectedUser) loadUserOrders(selectedUser.user_id);
    }
  };

  const handleOrderClose = async () => {
    if (!editingOrder || !selectedUser) return;
    const closePnl = parseFloat(orderEditForm.pnl) || 0;
    const commission = calculateCommission(editingOrder.symbol_name, Number(editingOrder.lots), Number(editingOrder.current_price));
    const netPnl = closePnl - commission;
    
    const { error } = await supabase
      .from("orders")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        pnl: netPnl,
      })
      .eq("id", editingOrder.id);
    if (error) {
      toast.error("Kapatma başarısız: " + error.message);
    } else {
      // Update user balance
      const { data: profileData } = await supabase
        .from("profiles")
        .select("balance, credit")
        .eq("user_id", selectedUser.user_id)
        .single();
      
      if (profileData) {
        const newBalance = Number(profileData.balance) + netPnl;
        
        // Recalculate with remaining orders
        const { data: remainingOrders } = await supabase
          .from("orders")
          .select("symbol_name, type, lots, entry_price, leverage, symbol_id")
          .eq("user_id", selectedUser.user_id)
          .eq("status", "open")
          .neq("id", editingOrder.id);
        
        let remainingPnl = 0;
        let remainingMargin = 0;
        if (remainingOrders) {
          const symbolIds = [...new Set(remainingOrders.map(o => (o as any).symbol_id).filter(Boolean))];
          const { data: symbolsData } = await supabase.from("symbols").select("id, current_price").in("id", symbolIds);
          const priceMap = new Map((symbolsData ?? []).map(s => [s.id, Number(s.current_price)]));
          
          for (const o of remainingOrders) {
            const livePrice = priceMap.get((o as any).symbol_id) || Number((o as any).entry_price);
            remainingPnl += calculatePnl(o.symbol_name, o.type as "buy" | "sell", Number(o.lots), Number(o.entry_price), livePrice);
            remainingMargin += calculateMargin(o.symbol_name, Number(o.lots), Number(o.entry_price), 200);
          }
        }
        
        const newEquity = newBalance + Number(profileData.credit) + remainingPnl;
        const newFreeMargin = newEquity - remainingMargin;
        
        await supabase
          .from("profiles")
          .update({ balance: newBalance, equity: newEquity, free_margin: newFreeMargin })
          .eq("user_id", selectedUser.user_id);
      }
      
      toast.success("Pozisyon kapatıldı");
      setEditingOrder(null);
      loadUserOrders(selectedUser.user_id);
      loadProfiles();
    }
  };

  const loadAllOrders = async (userId: string) => {
    setShowAllOrders(true);
    setLoadingAllOrders(true);
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setAllUserOrders(data || []);
    setLoadingAllOrders(false);
  };

  const handleBanToggle = async (profile: Profile, banType?: string) => {
    if (profile.is_banned) {
      // Unban
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: false, ban_reason: null, ban_type: "account" })
        .eq("id", profile.id);
      if (error) {
        toast.error("İşlem başarısız: " + error.message);
      } else {
        toast.success("Engel kaldırıldı");
        loadProfiles();
      }
    } else {
      // Ban
      const type = banType || "account";
      const reason = prompt("Engelleme sebebi (opsiyonel):") || (type === "full" ? "Hesap tamamen engellenmiştir" : "Hesap engellenmiştir");
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: true, ban_reason: reason, ban_type: type })
        .eq("id", profile.id);
      if (error) {
        toast.error("İşlem başarısız: " + error.message);
      } else {
        toast.success(type === "full" ? "Kullanıcı tamamen engellendi (site erişimi kapalı)" : "Kullanıcı engellendi (giriş yapamaz)");
        loadProfiles();
      }
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Doğrulanmış</span>;
      case "pending":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">Doğrulanmamış</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Reddedildi</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Müşteri listesi ve yönetim işlemleri</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
            {profiles.length} kullanıcı
          </span>
          <Button variant="outline" size="sm" onClick={loadProfiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kullanıcı ara..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="pl-9 bg-muted/50"
        />
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">MTID</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead className="hidden md:table-cell">DOĞRULAMA</TableHead>
                <TableHead className="hidden lg:table-cell">KYC</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead className="w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.map((profile) => (
                <TableRow
                  key={profile.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedUser(profile)}
                >
                  <TableCell className="font-mono text-xs">{profile.meta_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${profile.is_banned ? "bg-destructive/10" : "bg-primary/10"}`}>
                        <span className={`text-xs font-bold ${profile.is_banned ? "text-destructive" : "text-primary"}`}>
                          {(profile.full_name || "?")[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{profile.full_name || "İsimsiz"}</p>
                          {profile.is_banned && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">Engelli</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{profile.user_id.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getVerificationBadge(profile.verification_status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">Standart</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm font-semibold text-success">
                      ${Number(profile.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); openEdit(profile); }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Kullanıcı bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProfiles.length)} / {filteredProfiles.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Preview Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Hızlı Önizleme</SheetTitle>
          </SheetHeader>
          {selectedUser && (() => {
            const liveProfile = profiles.find(p => p.id === selectedUser.id) || selectedUser;
            return (
            <div className="mt-6 space-y-6">
              {/* User Avatar & Name */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-primary">
                    {(liveProfile.full_name || "?")[0]?.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{liveProfile.full_name || "İsimsiz"}</h3>
                <p className="text-xs text-muted-foreground font-mono">{liveProfile.user_id.slice(0, 16)}...</p>
                <div className="mt-2">
                  {getVerificationBadge(liveProfile.verification_status)}
                </div>
              </div>

              {/* Balance & Credit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Bakiye</p>
                  <p className="text-lg font-bold font-mono text-success">
                    ${Number(liveProfile.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Kredi</p>
                  <p className="text-lg font-bold font-mono">
                    ${Number(liveProfile.credit).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Kullanıcı Bilgileri
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">MTID:</span>
                    <span className="text-sm font-mono font-medium">{liveProfile.meta_id}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Telefon:</span>
                    <span className="text-sm font-mono">{liveProfile.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Doğrulama:</span>
                    {getVerificationBadge(liveProfile.verification_status)}
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Kaldıraç:</span>
                    <span className="text-sm font-medium">{liveProfile.leverage}</span>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="text-success">$</span> Finansal Bilgiler
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Varlık:</span>
                    <span className="text-sm font-mono font-medium">
                      ${Number(liveProfile.equity).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Serbest Margin:</span>
                    <span className="text-sm font-mono font-medium">
                      ${Number(liveProfile.free_margin).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Open Positions */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Açık Pozisyonlar
                  <span className="text-[10px] text-muted-foreground ml-auto">• Canlı</span>
                </h4>
                {loadingOrders && selectedUserOrders.length === 0 ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedUserOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Açık pozisyon yok.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUserOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 rounded-lg border border-border space-y-1 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => openOrderEdit(order)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {order.type === "buy" ? (
                              <TrendingUp className="h-3.5 w-3.5 text-buy" />
                            ) : (
                              <TrendingDown className="h-3.5 w-3.5 text-sell" />
                            )}
                            <span className="text-sm font-semibold">{order.symbol_name}</span>
                          </div>
                          <span className={`text-sm font-mono font-bold ${Number(order.pnl) >= 0 ? "text-buy" : "text-sell"}`}>
                            {Number(order.pnl) >= 0 ? "+" : ""}{Number(order.pnl).toFixed(2)}$
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{order.type === "buy" ? "AL" : "SAT"} • {order.lots} lot • {order.leverage}</span>
                          <span>{Number(order.entry_price).toFixed(2)} → {Number(order.current_price).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>SL: {order.stop_loss ? Number(order.stop_loss).toFixed(2) : "—"}</span>
                          <span>TP: {order.take_profit ? Number(order.take_profit).toFixed(2) : "—"}</span>
                          <Settings className="h-3 w-3 text-muted-foreground/50" />
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t border-border">
                      <span className="text-xs font-medium text-muted-foreground">Toplam K/Z:</span>
                      <span className={`text-sm font-mono font-bold ${selectedUserOrders.reduce((s, o) => s + Number(o.pnl), 0) >= 0 ? "text-buy" : "text-sell"}`}>
                        {selectedUserOrders.reduce((s, o) => s + Number(o.pnl), 0) >= 0 ? "+" : ""}
                        {selectedUserOrders.reduce((s, o) => s + Number(o.pnl), 0).toFixed(2)}$
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Hızlı İşlemler</h4>
                <Button
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => loadAllOrders(liveProfile.user_id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Tüm İşlemleri Gör
                </Button>
                <Button variant="outline" className="w-full" onClick={() => openEdit(liveProfile)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Ayarlar
                </Button>
                {liveProfile.is_banned ? (
                  <>
                    <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                      <div className="flex items-center gap-2 mb-1">
                        <Ban className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-destructive">
                          {liveProfile.ban_type === "full" ? "Tam Engel (Site Erişimi Kapalı)" : "Hesap Engeli (Giriş Yapamaz)"}
                        </span>
                      </div>
                      {liveProfile.ban_reason && (
                        <p className="text-xs text-muted-foreground ml-6">{liveProfile.ban_reason}</p>
                      )}
                    </div>
                    <Button variant="outline" className="w-full border-success text-success hover:bg-success/10" onClick={() => handleBanToggle(liveProfile)}>
                      <ShieldCheck className="h-4 w-4 mr-2" /> Engeli Kaldır
                    </Button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-warning text-warning hover:bg-warning/10"
                      onClick={() => handleBanToggle(liveProfile, "account")}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      <span className="text-xs">Hesap Engeli</span>
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleBanToggle(liveProfile, "full")}
                    >
                      <ShieldAlert className="h-4 w-4 mr-1" />
                      <span className="text-xs">Tam Engel</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* All Orders Dialog Content */}
              {showAllOrders && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold">Tüm İşlemler</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowAllOrders(false)} className="h-7 text-xs">Kapat</Button>
                  </div>
                  {loadingAllOrders ? (
                    <div className="flex justify-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : allUserOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">İşlem bulunamadı.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {allUserOrders.map((order: any) => (
                        <div key={order.id} className="p-2.5 rounded-lg border border-border space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {order.type === "buy" ? (
                                <TrendingUp className="h-3 w-3 text-buy" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-sell" />
                              )}
                              <span className="text-xs font-semibold">{order.symbol_name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                order.status === "open" ? "bg-buy/15 text-buy" : "bg-muted text-muted-foreground"
                              }`}>
                                {order.status === "open" ? "Açık" : "Kapalı"}
                              </span>
                            </div>
                            <span className={`text-xs font-mono font-bold ${Number(order.pnl) >= 0 ? "text-buy" : "text-sell"}`}>
                              {Number(order.pnl) >= 0 ? "+" : ""}{Number(order.pnl).toFixed(2)}$
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{order.type === "buy" ? "AL" : "SAT"} • {order.lots} lot</span>
                            <span>{Number(order.entry_price).toFixed(2)} → {Number(order.current_price).toFixed(2)}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("tr-TR")} {new Date(order.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            {order.closed_at && ` → ${new Date(order.closed_at).toLocaleDateString("tr-TR")} ${new Date(order.closed_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bakiye ($)</label>
              <Input
                type="number"
                value={editForm.balance}
                onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kredi ($)</label>
              <Input
                type="number"
                value={editForm.credit}
                onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kaldıraç</label>
              <Select value={editForm.leverage} onValueChange={(v) => setEditForm({ ...editForm, leverage: v })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1:10", "1:50", "1:100", "1:200", "1:500"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Doğrulama Durumu</label>
              <Select value={editForm.verification_status} onValueChange={(v) => setEditForm({ ...editForm, verification_status: v })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="verified">Onaylı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Edit Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden" aria-describedby={undefined}>
          {editingOrder && (() => {
            const entryVal = parseFloat(orderEditForm.entry_price) || editingOrder.entry_price;
            const lotsVal = parseFloat(orderEditForm.lots) || editingOrder.lots;
            const orderType = orderEditForm.type;
            const currentPnl = calculatePnl(editingOrder.symbol_name, orderType, lotsVal, entryVal, editingOrder.current_price);
            const margin = calculateMargin(editingOrder.symbol_name, lotsVal, entryVal, 200);
            const commission = calculateCommission(editingOrder.symbol_name, lotsVal, editingOrder.current_price);
            const netPnl = currentPnl - commission;
            const pnlPercent = margin > 0 ? (currentPnl / margin) * 100 : 0;
            const slVal = orderEditForm.stop_loss ? parseFloat(orderEditForm.stop_loss) : null;
            const tpVal = orderEditForm.take_profit ? parseFloat(orderEditForm.take_profit) : null;
            const slPnl = slVal ? calculatePnl(editingOrder.symbol_name, orderType, lotsVal, entryVal, slVal) : null;
            const tpPnl = tpVal ? calculatePnl(editingOrder.symbol_name, orderType, lotsVal, entryVal, tpVal) : null;

            return (
              <>
                {/* Header Banner */}
                <div className={`px-5 py-4 ${orderType === "buy" ? "bg-buy/10" : "bg-sell/10"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${orderType === "buy" ? "bg-buy/20" : "bg-sell/20"}`}>
                        {orderType === "buy" ? (
                          <TrendingUp className="h-5 w-5 text-buy" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-sell" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{editingOrder.symbol_name}</h3>
                        {/* Direction Toggle */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => setOrderEditForm(prev => ({ ...prev, type: "buy" }))}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${orderType === "buy" ? "bg-buy text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            ALIŞ
                          </button>
                          <button
                            onClick={() => setOrderEditForm(prev => ({ ...prev, type: "sell" }))}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${orderType === "sell" ? "bg-sell text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                          >
                            SATIŞ
                          </button>
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">1:200</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Anlık Fiyat</p>
                      <p className="text-base font-bold font-mono text-foreground">{Number(editingOrder.current_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </div>

                {/* Live Stats Bar */}
                <div className="grid grid-cols-3 gap-px bg-border mx-5 mt-4 rounded-lg overflow-hidden">
                  <div className="bg-card p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Teminat</p>
                    <p className="text-xs font-bold font-mono text-foreground mt-0.5">${margin.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-card p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">K/Z</p>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${currentPnl >= 0 ? "text-buy" : "text-sell"}`}>
                      {currentPnl >= 0 ? "+" : ""}{currentPnl.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}$
                    </p>
                  </div>
                  <div className="bg-card p-2.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">K/Z %</p>
                    <p className={`text-xs font-bold font-mono mt-0.5 ${pnlPercent >= 0 ? "text-buy" : "text-sell"}`}>
                      {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="px-5 py-4 space-y-4">
                  {/* Entry Price & Lots */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Giriş Fiyatı</label>
                      <Input
                        type="number"
                        value={orderEditForm.entry_price}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, entry_price: e.target.value })}
                        className="bg-muted/50 font-mono h-10 text-sm"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Lot Miktarı</label>
                      <Input
                        type="number"
                        value={orderEditForm.lots}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, lots: e.target.value })}
                        className="bg-muted/50 font-mono h-10 text-sm"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* SL & TP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-sell uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" /> Zarar Durdur
                      </label>
                      <Input
                        type="number"
                        value={orderEditForm.stop_loss}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, stop_loss: e.target.value })}
                        className="bg-muted/50 font-mono h-10 text-sm border-sell/20 focus-visible:ring-sell/30"
                        placeholder="—"
                        step="0.01"
                      />
                      {slPnl !== null && (
                        <p className={`text-[10px] font-mono mt-1 ${slPnl >= 0 ? "text-buy" : "text-sell"}`}>
                          → {slPnl >= 0 ? "+" : ""}{slPnl.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}$
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-buy uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Target className="h-3 w-3" /> Kâr Al
                      </label>
                      <Input
                        type="number"
                        value={orderEditForm.take_profit}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, take_profit: e.target.value })}
                        className="bg-muted/50 font-mono h-10 text-sm border-buy/20 focus-visible:ring-buy/30"
                        placeholder="—"
                        step="0.01"
                      />
                      {tpPnl !== null && (
                        <p className={`text-[10px] font-mono mt-1 ${tpPnl >= 0 ? "text-buy" : "text-sell"}`}>
                          → {tpPnl >= 0 ? "+" : ""}{tpPnl.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}$
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Manual PnL Override */}
                  <div className="p-3 rounded-lg border border-border bg-muted/30">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Manuel K/Z (Hesaplanan: <span className={currentPnl >= 0 ? "text-buy" : "text-sell"}>{currentPnl >= 0 ? "+" : ""}{currentPnl.toFixed(2)}$</span>)
                    </label>
                    <Input
                      type="number"
                      value={orderEditForm.pnl}
                      onChange={(e) => setOrderEditForm({ ...orderEditForm, pnl: e.target.value })}
                      className="bg-background font-mono h-10 text-sm"
                      step="0.01"
                    />
                    <p className="text-[9px] text-muted-foreground mt-1.5">
                      Komisyon: {commission.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}$ • Net K/Z: <span className={netPnl >= 0 ? "text-buy" : "text-sell"}>{netPnl >= 0 ? "+" : ""}{netPnl.toFixed(2)}$</span>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button onClick={handleOrderSave} className="w-full h-11 font-semibold">
                      Kaydet
                    </Button>
                    <Button variant="destructive" onClick={handleOrderClose} className="w-full h-11 font-semibold">
                      Pozisyonu Kapat
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
