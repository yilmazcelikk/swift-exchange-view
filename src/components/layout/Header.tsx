import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ balance: number; equity: number; free_margin: number; credit: number } | null>(null);

  useEffect(() => {
    if (user) {
      // Initial load
      supabase.from("profiles").select("balance, equity, free_margin, credit").eq("user_id", user.id).single().then(({ data }) => {
        if (data) setProfile({ balance: Number(data.balance), equity: Number(data.equity), free_margin: Number(data.free_margin), credit: Number(data.credit) });
      });

      // Realtime subscription
      const channel = supabase
        .channel('header-profile')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (payload.new) {
            const d = payload.new as any;
            setProfile({ balance: Number(d.balance), equity: Number(d.equity), free_margin: Number(d.free_margin) });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const stats = [
    { label: "Bakiye", value: `$${(profile?.balance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Varlık", value: `$${(profile?.equity ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Serbest", value: `$${(profile?.free_margin ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
  ];

  return (
    <header className="h-12 md:h-14 border-b bg-card flex items-center justify-between px-3 md:px-4 gap-2">
      <div className="flex items-center gap-3 md:gap-6 overflow-x-auto no-scrollbar">
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
