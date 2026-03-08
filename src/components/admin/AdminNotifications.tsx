import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ArrowDownToLine, ArrowUpFromLine, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  type: "deposit" | "withdrawal" | "document";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return `${Math.floor(diff / 86400)}g önce`;
};

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("admin_read_notifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchNotifications = useCallback(async () => {
    const [txRes, docRes, profilesRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, currency, status, created_at, user_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("documents")
        .select("id, type, created_at, user_id, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    const profiles = profilesRes.data || [];
    const profileMap = new Map(profiles.map((p) => [p.user_id, p.full_name || "Bilinmeyen"]));

    const items: Notification[] = [];

    for (const tx of txRes.data || []) {
      const userName = profileMap.get(tx.user_id) || "Bilinmeyen";
      const isDeposit = tx.type === "deposit";
      items.push({
        id: tx.id,
        type: isDeposit ? "deposit" : "withdrawal",
        title: isDeposit ? "Yeni Yatırım Talebi" : "Yeni Çekim Talebi",
        description: `${userName} - ${Number(tx.amount).toLocaleString("tr-TR")} ${tx.currency}`,
        time: formatTimeAgo(new Date(tx.created_at)),
        read: readIds.has(tx.id),
      });
    }

    for (const doc of docRes.data || []) {
      const userName = profileMap.get(doc.user_id) || "Bilinmeyen";
      items.push({
        id: doc.id,
        type: "document",
        title: "Yeni Evrak Yüklendi",
        description: `${userName} - ${doc.type === "id" ? "Kimlik" : doc.type === "address" ? "Adres" : doc.type}`,
        time: formatTimeAgo(new Date(doc.created_at)),
        read: readIds.has(doc.id),
      });
    }

    items.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return 0;
    });

    setNotifications(items);
  }, [readIds]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    const merged = new Set([...readIds, ...allIds]);
    setReadIds(merged);
    localStorage.setItem("admin_read_notifications", JSON.stringify([...merged]));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "deposit":
        return <ArrowDownToLine className="h-4 w-4 text-success" />;
      case "withdrawal":
        return <ArrowUpFromLine className="h-4 w-4 text-warning" />;
      case "document":
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  const getBg = (type: Notification["type"]) => {
    switch (type) {
      case "deposit":
        return "bg-success/10";
      case "withdrawal":
        return "bg-warning/10";
      case "document":
        return "bg-primary/10";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Bildirimler</h4>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Tümünü okundu işaretle
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Bildirim yok
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                    n.read ? "opacity-60" : "bg-muted/30"
                  }`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${getBg(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {n.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
