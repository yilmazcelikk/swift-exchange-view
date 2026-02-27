import { Bell, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { mockUser } from "@/data/mockData";
import { Button } from "@/components/ui/button";

export function Header() {
  const user = mockUser;

  const stats = [
    { label: "Bakiye", value: `$${user.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Kredi", value: `$${user.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Açık K&Z", value: `$${user.openPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, positive: user.openPnl >= 0 },
    { label: "Varlık", value: `$${user.equity.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
    { label: "Serbest Teminat", value: `$${user.freeMargin.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` },
  ];

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4">
      <div className="flex items-center gap-6 overflow-x-auto">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className={`text-sm font-semibold font-mono ${
              'positive' in stat
                ? stat.positive ? 'text-buy' : 'text-sell'
                : 'text-foreground'
            }`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sell" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
