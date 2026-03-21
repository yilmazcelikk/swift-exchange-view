import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculatePnl, calculateMargin, calculateCommission, calculateSwap, ACCOUNT_TYPE_LABELS } from "@/lib/trading";
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
import { Search, X, RefreshCw, Eye, Settings, ChevronLeft, ChevronRight, User, TrendingUp, TrendingDown, Ban, ShieldCheck, ShieldAlert, Target, Plus, ChevronsUpDown, Check, Trash2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
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
  tc_identity: string | null;
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
  account_type: string;
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
  created_at: string;
}

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserOrders, setSelectedUserOrders] = useState<OrderRow[]>([]);
  const [allUserOrders, setAllUserOrders] = useState<any[]>([]);
  const [allUserTransactions, setAllUserTransactions] = useState<any[]>([]);
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
    tc_identity: "",
    account_type: "standard",
    balance_description: "",
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
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newPositionForm, setNewPositionForm] = useState({
    symbol_name: "XAUUSD",
    type: "buy" as "buy" | "sell",
    lots: "0.01",
    entry_price: "",
    stop_loss: "",
    take_profit: "",
    leverage: "1:200",
  });
  const [symbols, setSymbols] = useState<{ id: string; name: string; current_price: number }[]>([]);
  const [newPositionSaving, setNewPositionSaving] = useState(false);
  const [symbolSearchOpen, setSymbolSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 25;

  useEffect(() => {
    loadProfiles(true);
    loadSymbols();
  }, []);

  const loadSymbols = async () => {
    const { data } = await supabase.from("symbols").select("id, name, current_price").eq("is_active", true).order("name");
    if (data) setSymbols(data.map(s => ({ ...s, current_price: Number(s.current_price) })));
  };

  const loadUserOrders = useCallback(async (userId: string, isInitial = false) => {
    if (isInitial) setLoadingOrders(true);
    try {
      // Fetch open orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, symbol_name, type, lots, entry_price, current_price, pnl, leverage, symbol_id, stop_loss, take_profit, created_at")
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

  // Real-time polling for selected user's orders - faster refresh
  useEffect(() => {
    if (selectedUser) {
      loadUserOrders(selectedUser.user_id, true);
      const interval = setInterval(() => {
        loadUserOrders(selectedUser.user_id, false);
      }, 1500);
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

  const loadProfiles = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles((data as Profile[]) || []);
    if (showSpinner) setLoading(false);
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
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      tc_identity: profile.tc_identity || "",
      account_type: profile.account_type || "standard",
      balance_description: "",
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
        full_name: editForm.full_name || null,
        phone: editForm.phone || null,
        tc_identity: editForm.tc_identity || null,
        account_type: editForm.account_type,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      // If balance changed, create a transaction record so user sees it in history
      const balanceDiff = newBalance - editingUser.balance;
      if (balanceDiff !== 0) {
        const txnType = balanceDiff > 0 ? "deposit" : "withdrawal";
        const txnAmount = Math.abs(balanceDiff);
        await supabase.from("transactions").insert({
          user_id: editingUser.user_id,
          type: txnType,
          amount: txnAmount,
          currency: "USD",
          status: "approved",
          method: null,
          description: editForm.balance_description || null,
        });
      }

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
    const commission = calculateCommission(editingOrder.symbol_name, Number(editingOrder.lots), Number(editingOrder.current_price), selectedUser?.account_type || "standard");
    const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(editingOrder.created_at).getTime()) / 86400000));
    const swap = calculateSwap(editingOrder.symbol_name, Number(editingOrder.lots), daysHeld);
    const netPnl = closePnl - commission + swap;

    const { data, error } = await supabase.rpc("close_position", {
      p_order_id: editingOrder.id,
      p_close_price: Number(editingOrder.current_price),
      p_net_pnl: netPnl,
      p_swap: swap,
      p_close_reason: "admin_close",
    });

    if (error) {
      toast.error("Kapatma başarısız: " + error.message);
    } else if (data && typeof data === "object" && !(data as any).success) {
      toast.error("Kapatma başarısız: " + ((data as any).reason || "Bilinmeyen hata"));
    } else {
      toast.success("Pozisyon kapatıldı");
      setEditingOrder(null);
      loadUserOrders(selectedUser.user_id);
      loadProfiles();
    }
  };

  const loadAllOrders = async (userId: string) => {
    setShowAllOrders(true);
    setLoadingAllOrders(true);
    const [ordersRes, txnRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", userId).eq("status", "approved").order("created_at", { ascending: false }),
    ]);
    setAllUserOrders(ordersRes.data || []);
    setAllUserTransactions(txnRes.data || []);
    setLoadingAllOrders(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast.error("Silme başarısız: " + error.message);
    } else {
      setAllUserOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success("İşlem silindi");
    }
  };

  const handleDeleteTransaction = async (txnId: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", txnId);
    if (error) {
      toast.error("Silme başarısız: " + error.message);
    } else {
      setAllUserTransactions(prev => prev.filter(t => t.id !== txnId));
      toast.success("İşlem kaydı silindi");
    }
  };

  const fetchLatestPrice = async (symbolName: string): Promise<number | null> => {
    const { data } = await supabase.from("symbols").select("current_price").eq("name", symbolName).single();
    return data ? Number(data.current_price) : null;
  };

  const openNewPositionDialog = async () => {
    if (!selectedUser) return;
    const defaultSymbol = symbols.length > 0 ? symbols[0] : null;
    const defaultName = defaultSymbol?.name || "XAUUSD";
    const freshPrice = await fetchLatestPrice(defaultName);
    setNewPositionForm({
      symbol_name: defaultName,
      type: "buy",
      lots: "0.01",
      entry_price: freshPrice ? String(freshPrice) : (defaultSymbol ? String(defaultSymbol.current_price) : ""),
      stop_loss: "",
      take_profit: "",
      leverage: selectedUser.leverage || "1:200",
    });
    setShowNewPosition(true);
  };

  const handleOpenPosition = async () => {
    if (!selectedUser) return;
    setNewPositionSaving(true);
    try {
      const sym = symbols.find(s => s.name === newPositionForm.symbol_name);
      if (!sym) { toast.error("Sembol bulunamadı"); setNewPositionSaving(false); return; }
      
      // Always fetch the latest price from DB
      const freshPrice = await fetchLatestPrice(sym.name);
      const latestPrice = freshPrice ?? sym.current_price;
      const entryPrice = parseFloat(newPositionForm.entry_price) || latestPrice;
      const lots = parseFloat(newPositionForm.lots) || 0.01;
      const leverageRatio = parseInt(newPositionForm.leverage.split(":")[1] || "200", 10);
      const margin = calculateMargin(newPositionForm.symbol_name, lots, entryPrice, leverageRatio);

      const { error } = await supabase.from("orders").insert({
        user_id: selectedUser.user_id,
        symbol_id: sym.id,
        symbol_name: sym.name,
        type: newPositionForm.type,
        order_type: "market",
        lots,
        entry_price: entryPrice,
        current_price: latestPrice,
        stop_loss: newPositionForm.stop_loss ? parseFloat(newPositionForm.stop_loss) : null,
        take_profit: newPositionForm.take_profit ? parseFloat(newPositionForm.take_profit) : null,
        leverage: newPositionForm.leverage,
        status: "open",
        pnl: 0,
        swap: 0,
      });

      if (error) {
        toast.error("Pozisyon açılamadı: " + error.message);
      } else {
        const newFreeMargin = selectedUser.free_margin - margin;
        await supabase.from("profiles").update({
          free_margin: Math.max(0, newFreeMargin),
        }).eq("user_id", selectedUser.user_id);

        toast.success(`${sym.name} ${newPositionForm.type === "buy" ? "ALIŞ" : "SATIŞ"} pozisyon açıldı (${lots} lot)`);
        setShowNewPosition(false);
        loadUserOrders(selectedUser.user_id, true);
        loadProfiles();
      }
    } finally {
      setNewPositionSaving(false);
    }
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold">Kullanıcı Yönetimi</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Müşteri listesi ve yönetim işlemleri</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
            {profiles.length} kullanıcı
          </span>
          <Button variant="outline" size="sm" onClick={() => loadProfiles(true)} disabled={loading}>
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
                <TableHead className="hidden lg:table-cell">Hesap Türü</TableHead>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      profile.account_type === "diamond" ? "bg-primary/20 text-primary" :
                      profile.account_type === "gold" ? "bg-amber-500/20 text-amber-500" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {ACCOUNT_TYPE_LABELS[profile.account_type] || "Standart"}
                    </span>
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
              {/* User Name */}
              <div className="flex flex-col items-center text-center">
                <h3 className="text-lg font-bold">{liveProfile.full_name || "İsimsiz"}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{liveProfile.user_id.slice(0, 16)}...</p>
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
                    <span className="text-sm text-muted-foreground">TC Kimlik:</span>
                    <span className="text-sm font-mono">{liveProfile.tc_identity || "—"}</span>
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
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={openNewPositionDialog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Pozisyon Aç
                </Button>
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
        <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          {editingUser && (() => {
            const liveProfile = profiles.find(p => p.id === editingUser.id) || editingUser;
            return (
              <>
                {/* User Header */}
                <div className="px-5 py-4 bg-muted/30 border-b border-border">
                  <div>
                    <h3 className="text-base font-bold truncate">{liveProfile.full_name || "İsimsiz"}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-muted-foreground">MTID: {liveProfile.meta_id}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{liveProfile.user_id.slice(0, 12)}...</span>
                    </div>
                  </div>
                  {/* Live Stats */}
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[
                      { label: "Bakiye", value: `$${Number(liveProfile.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: "text-buy" },
                      { label: "Kredi", value: `$${Number(liveProfile.credit).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: "text-foreground" },
                      { label: "Varlık", value: `$${Number(liveProfile.equity).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: "text-foreground" },
                      { label: "S. Teminat", value: `$${Number(liveProfile.free_margin).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: "text-foreground" },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-2 rounded-lg bg-background border border-border">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                        <p className={`text-xs font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-5 py-4 space-y-5">
                  {/* Kişisel Bilgiler */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Kişisel Bilgiler
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Ad Soyad</label>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="bg-muted/50 h-9 text-sm"
                          placeholder="Ad Soyad"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Telefon</label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="bg-muted/50 h-9 text-sm font-mono"
                          placeholder="+90 5XX XXX XX XX"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">TC Kimlik No</label>
                        <Input
                          value={editForm.tc_identity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setEditForm({ ...editForm, tc_identity: val });
                          }}
                          inputMode="numeric"
                          maxLength={11}
                          className="bg-muted/50 h-9 text-sm font-mono"
                          placeholder="11 haneli TC Kimlik"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Finansal Bilgiler */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span className="text-buy">$</span> Finansal Bilgiler
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Bakiye ($)</label>
                        <Input
                          type="number"
                          value={editForm.balance}
                          onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                          className="bg-muted/50 font-mono h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Kredi ($)</label>
                        <Input
                          type="number"
                          value={editForm.credit}
                          onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })}
                          className="bg-muted/50 font-mono h-9 text-sm"
                        />
                      </div>
                    </div>
                    {/* Show description field when balance is being changed */}
                    {editingUser && parseFloat(editForm.balance) !== editingUser.balance && (
                      <div className="mt-3">
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">İşlem Açıklaması (kullanıcı görecek)</label>
                        <Input
                          value={editForm.balance_description}
                          onChange={(e) => setEditForm({ ...editForm, balance_description: e.target.value })}
                          className="bg-muted/50 h-9 text-sm"
                          placeholder="Örn: Bonus, Düzeltme, Kampanya..."
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Fark: <span className={`font-mono font-bold ${(parseFloat(editForm.balance) - editingUser.balance) >= 0 ? "text-buy" : "text-sell"}`}>
                            {(parseFloat(editForm.balance) - editingUser.balance) >= 0 ? "+" : ""}{(parseFloat(editForm.balance) - editingUser.balance).toFixed(2)} USD
                          </span> → Kullanıcının geçmişinde {(parseFloat(editForm.balance) - editingUser.balance) >= 0 ? "para yatırma" : "para çekme"} olarak görünecek
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Hesap Ayarları */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5" /> Hesap Ayarları
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Kaldıraç</label>
                        <Select value={editForm.leverage} onValueChange={(v) => setEditForm({ ...editForm, leverage: v })}>
                          <SelectTrigger className="bg-muted/50 h-9 text-sm">
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
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Doğrulama Durumu</label>
                        <Select value={editForm.verification_status} onValueChange={(v) => setEditForm({ ...editForm, verification_status: v })}>
                          <SelectTrigger className="bg-muted/50 h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Bekliyor</SelectItem>
                            <SelectItem value="verified">Onaylı</SelectItem>
                            <SelectItem value="rejected">Reddedildi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Hesap Türü</label>
                        <Select value={editForm.account_type} onValueChange={(v) => setEditForm({ ...editForm, account_type: v })}>
                          <SelectTrigger className="bg-muted/50 h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standart</SelectItem>
                            <SelectItem value="gold">Altın</SelectItem>
                            <SelectItem value="diamond">Elmas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Kayıt Tarihi:</span>
                        <p className="font-medium mt-0.5">{new Date(liveProfile.created_at).toLocaleDateString("tr-TR")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Referans Kodu:</span>
                        <p className="font-medium font-mono mt-0.5">{liveProfile.referral_code || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSave} className="w-full h-11 font-semibold">
                    Kaydet
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* New Position Dialog */}
      <Dialog open={showNewPosition} onOpenChange={setShowNewPosition}>
        <DialogContent className="max-w-md p-0 overflow-hidden" aria-describedby={undefined}>
          <div className="px-5 py-4 bg-primary/5 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Pozisyon Aç — {selectedUser?.full_name || "Kullanıcı"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">MTID: {selectedUser?.meta_id}</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* Symbol */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sembol</label>
              <Popover open={symbolSearchOpen} onOpenChange={setSymbolSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={symbolSearchOpen}
                    className="w-full justify-between bg-muted/50 h-9 text-sm font-normal"
                  >
                    {newPositionForm.symbol_name
                      ? `${newPositionForm.symbol_name} — $${(symbols.find(s => s.name === newPositionForm.symbol_name)?.current_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : "Sembol seçin..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Sembol ara..." />
                    <CommandList>
                      <CommandEmpty>Sembol bulunamadı.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {symbols.map(s => (
                          <CommandItem
                            key={s.id}
                            value={s.name}
                            onSelect={async () => {
                              setSymbolSearchOpen(false);
                              const freshPrice = await fetchLatestPrice(s.name);
                              setNewPositionForm(prev => ({
                                ...prev,
                                symbol_name: s.name,
                                entry_price: String(freshPrice ?? s.current_price),
                              }));
                            }}
                            className="flex items-center justify-between"
                          >
                            <span className="font-mono font-medium">{s.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">${s.current_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                              {newPositionForm.symbol_name === s.name && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Direction */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Yön</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewPositionForm(prev => ({ ...prev, type: "buy" }))}
                  className={`flex-1 text-sm font-bold py-2.5 rounded-lg transition-all ${newPositionForm.type === "buy" ? "bg-buy text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  ALIŞ (BUY)
                </button>
                <button
                  onClick={() => setNewPositionForm(prev => ({ ...prev, type: "sell" }))}
                  className={`flex-1 text-sm font-bold py-2.5 rounded-lg transition-all ${newPositionForm.type === "sell" ? "bg-sell text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  SATIŞ (SELL)
                </button>
              </div>
            </div>

            {/* Lots & Entry Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Lot</label>
                <Input
                  type="number"
                  value={newPositionForm.lots}
                  onChange={(e) => setNewPositionForm(prev => ({ ...prev, lots: e.target.value }))}
                  className="bg-muted/50 font-mono h-9 text-sm"
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Giriş Fiyatı</label>
                <Input
                  type="number"
                  value={newPositionForm.entry_price}
                  onChange={(e) => setNewPositionForm(prev => ({ ...prev, entry_price: e.target.value }))}
                  className="bg-muted/50 font-mono h-9 text-sm"
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
                  value={newPositionForm.stop_loss}
                  onChange={(e) => setNewPositionForm(prev => ({ ...prev, stop_loss: e.target.value }))}
                  className="bg-muted/50 font-mono h-9 text-sm border-sell/20"
                  placeholder="Opsiyonel"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-buy uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Kâr Al
                </label>
                <Input
                  type="number"
                  value={newPositionForm.take_profit}
                  onChange={(e) => setNewPositionForm(prev => ({ ...prev, take_profit: e.target.value }))}
                  className="bg-muted/50 font-mono h-9 text-sm border-buy/20"
                  placeholder="Opsiyonel"
                  step="0.01"
                />
              </div>
            </div>

            {/* Leverage */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Kaldıraç</label>
              <Select value={newPositionForm.leverage} onValueChange={(v) => setNewPositionForm(prev => ({ ...prev, leverage: v }))}>
                <SelectTrigger className="bg-muted/50 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1:10", "1:50", "1:100", "1:200", "1:500"].map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Margin Info */}
            {(() => {
              const lots = parseFloat(newPositionForm.lots) || 0;
              const price = parseFloat(newPositionForm.entry_price) || 0;
              const lev = parseInt(newPositionForm.leverage.split(":")[1] || "200", 10);
              const margin = lots > 0 && price > 0 ? calculateMargin(newPositionForm.symbol_name, lots, price, lev) : 0;
              return margin > 0 ? (
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gerekli Teminat:</span>
                    <span className="font-mono font-bold">${margin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serbest Teminat:</span>
                    <span className="font-mono font-bold">${selectedUser?.free_margin.toFixed(2)}</span>
                  </div>
                </div>
              ) : null;
            })()}

            <Button
              onClick={handleOpenPosition}
              disabled={newPositionSaving}
              className={`w-full h-11 font-semibold ${newPositionForm.type === "buy" ? "bg-buy hover:bg-buy/90" : "bg-sell hover:bg-sell/90"} text-white`}
            >
              {newPositionSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {newPositionForm.type === "buy" ? "ALIŞ" : "SATIŞ"} Pozisyon Aç
            </Button>
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
