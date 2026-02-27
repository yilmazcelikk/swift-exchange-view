import { mockOrders } from "@/data/mockData";

const History = () => {
  const closedOrders = mockOrders.filter(o => o.status === 'closed');
  const closedPnlTotal = closedOrders.reduce((sum, o) => sum + o.pnl, 0);

  return (
    <div className="flex flex-col h-full animate-slide-up">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">İşlem Geçmişi</h1>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        {closedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Kapatılmış işlem bulunmuyor.</p>
        ) : (
          <>
            <div className="divide-y divide-border">
              {closedOrders.map((order) => (
                <div key={order.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{order.symbolName}</span>
                      {' '}
                      <span className={`text-sm font-medium ${order.type === 'buy' ? 'text-buy' : 'text-sell'}`}>
                        {order.type} {order.lots}
                      </span>
                    </div>
                    <span className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                      {order.pnl >= 0 ? '+' : ''}{order.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground font-mono">
                      {order.entryPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} → {order.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')} {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Kâr</span>
                <span className={`font-mono font-medium ${closedPnlTotal >= 0 ? 'text-buy' : 'text-sell'}`}>
                  {closedPnlTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Swap</span>
                <span className="font-mono font-medium text-foreground">0.00</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Komisyon</span>
                <span className="font-mono font-medium text-foreground">0.00</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default History;
