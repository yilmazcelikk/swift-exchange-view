import { Bell, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { mockUser } from "@/data/mockData";
import { Button } from "@/components/ui/button";

export function Header() {
  const user = mockUser;

  const stats = [
    { label: "Bakiye", value: `$${user.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Varlık", value: `$${user.equity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "K&Z", value: `$${user.openPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, positive: user.openPnl >= 0 },
  ];

  return (
    <header className="h-12 md:h-14 border-b bg-card flex items-center justify-between px-3 md:px-4 gap-2">
      <div className="flex items-center gap-3 md:gap-6 overflow-x-auto no-scrollbar">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</span>
            <span className={`text-xs md:text-sm font-semibold font-mono ${
              'positive' in stat
                ? stat.positive ? 'text-buy' : 'text-sell'
                : 'text-foreground'
            }`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 md:gap-3 shrink-0">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sell" />
        </Button>
      </div>
    </header>
  );
}
