import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculatePnl, calculateMargin } from "@/lib/trading";

interface OpenOrder {
  id: string;
  symbol_id: string;
  symbol_name: string;
  type: string;
  lots: number;
  entry_price: number;
  current_price: number;
  leverage: string;
}

export function Header() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ balance: number; equity: number; free_margin: number; credit: number } | null>(null);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = () => {
      supabase.from("profiles").select("balance, equity, free_margin, credit").eq("user_id", user.id).single().then(({ data }) => {
        if (data) setProfile({ balance: Number(data.balance), equity: Number(data.equity), free_margin: Number(data.free_margin), credit: Number(data.credit) });
      });
    };

    const loadOrders = async () => {
      const { data } = await supabase.from("orders").select("id, symbol_id, symbol_name, type, lots, entry_price, current_price, leverage").eq("user_id", user.id).eq("status", "open");
      if (data) {
        const symbolIds = [...new Set(data.map(o => o.symbol_id))];
        const { data: symbolsData } = await supabase.from("symbols").select("id, current_price").in("id", symbolIds);
        const priceMap = new Map((symbolsData ?? []).map(s => [s.id, Number(s.current_price)]));
        
        setOpenOrders(data.map(o => ({
          ...o,
          lots: Number(o.lots),
          entry_price: Number(o.entry_price),
          current_price: priceMap.get(o.symbol_id) || Number(o.current_price),
          leverage: o.leverage || "1:200",
        })));
      } else {
        setOpenOrders([]);
      }
    };

    loadProfile();
    loadOrders();

    const profileChannel = supabase
      .channel('header-profile')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.new) {
          const d = payload.new as any;
          setProfile({ balance: Number(d.balance), equity: Number(d.equity), free_margin: Number(d.free_margin), credit: Number(d.credit) });
        }
      })
      .subscribe();

    const ordersChannel = supabase
      .channel('header-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => {
        loadOrders();
      })
      .subscribe();

    const symbolsChannel = supabase
      .channel('header-symbols')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'symbols' }, (payload) => {
        if (payload.new) {
          const updated = payload.new as any;
          setOpenOrders(prev => prev.map(o =>
            o.symbol_id === updated.id ? { ...o, current_price: Number(updated.current_price) } : o
          ));
        }
      })
      .subscribe();

    // Removed redundant 5s polling — realtime channels already handle updates

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(symbolsChannel);
      clearInterval(interval);
    };
  }, [user]);

  const { dynamicEquity, dynamicFreeMargin } = useMemo(() => {
    if (!profile) return { dynamicEquity: 0, dynamicFreeMargin: 0 };
    
    if (openOrders.length === 0) {
      return { dynamicEquity: profile.balance + profile.credit, dynamicFreeMargin: profile.balance + profile.credit };
    }

    const totalPnl = openOrders.reduce((sum, o) => {
      return sum + calculatePnl(o.symbol_name, o.type as "buy" | "sell", o.lots, o.entry_price, o.current_price);
    }, 0);

    const usedMargin = openOrders.reduce((sum, o) => {
      const lev = parseInt(o.leverage.split(":")[1] || "200", 10);
      return sum + calculateMargin(o.symbol_name, o.lots, o.entry_price, lev);
    }, 0);

    const equity = profile.balance + profile.credit + totalPnl;
    const freeMargin = equity - usedMargin;
    return { dynamicEquity: equity, dynamicFreeMargin: freeMargin };
  }, [profile, openOrders]);

  const stats = [
    { label: "Bakiye", value: `$${(profile?.balance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Kredi", value: `$${(profile?.credit ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Varlık", value: `$${dynamicEquity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Serbest", value: `$${dynamicFreeMargin.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
  ];

  return (
    <header className="h-12 md:h-14 border-b bg-card flex items-center justify-between px-3 md:px-4 gap-2">
      <div className="flex items-center gap-3 md:gap-6 overflow-x-auto no-scrollbar flex-1">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</span>
            <span className="text-xs md:text-sm font-semibold font-mono text-foreground">{stat.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 md:gap-3 shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
