import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  Settings,
  CheckCircle,
} from "lucide-react";

const AdminSettings = () => {
  const [sessionId, setSessionId] = useState("");
  const [showSessionId, setShowSessionId] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleSaveSession = () => {
    if (!sessionId.trim()) {
      toast.error("Session ID boş olamaz");
      return;
    }
    toast.success("TradingView Session ID kaydedildi");
  };

  const handleUpdateStocks = async () => {
    setUpdating(true);
    // Simulate update
    await new Promise((r) => setTimeout(r, 2000));
    setUpdating(false);
    toast.success("Hisse verileri güncellendi");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Sistem Ayarları</h2>
      </div>

      {/* TradingView API Connection */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            TradingView API Bağlantısı
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            BIST hisse senetleri verilerini çekmek için TradingView Session ID yapılandırması
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">TradingView Session ID</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSessionId ? "text" : "password"}
                  placeholder="TradingView sessionid cookie değerini girin"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="bg-muted/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSessionId(!showSessionId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSessionId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={handleSaveSession} className="gap-2 shrink-0">
                <Save className="h-4 w-4" /> Kaydet
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
            <p className="text-sm font-semibold">Manuel SessionID Alma:</p>
            <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
              <li>TradingView.com'a giriş yapın</li>
              <li>Tarayıcı Developer Tools'u açın (F12)</li>
              <li>Application/Storage → Cookies sekmesine gidin</li>
              <li>"sessionid" cookie değerini kopyalayın</li>
              <li>Buraya yapıştırıp kaydedin</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Update Stock Data */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Hisse Verilerini Güncelle
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            TradingView Scanner API üzerinden BIST hisse verilerini çek
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleUpdateStocks} disabled={updating} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Güncelleniyor..." : "Hisse Verilerini Güncelle"}
          </Button>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Çalışma Mantığı:</p>
              <p className="text-xs text-muted-foreground">
                Butona tıkladığınızda tüm BIST hisse senetleri TradingView'dan çekilir ve veritabanına kaydedilir.
                Borsa saatleri dışında son kapanış verileri gösterilir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">API Bilgileri</CardTitle>
          <p className="text-sm text-muted-foreground">TradingView API kullanım detayları</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8">
            <div>
              <p className="text-xs text-muted-foreground">API Kaynağı</p>
              <p className="text-sm font-semibold">TradingView Scanner</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Veri Borsası</p>
              <p className="text-sm font-semibold">BIST (Borsa İstanbul)</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Güncelleme Yöntemi</p>
              <p className="text-sm font-semibold">Manuel Tetikleme</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Veri Formatı</p>
              <p className="text-sm font-semibold">JSON</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            Genel Sistem Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold">Sistem Versiyonu</p>
              <p className="text-xs text-muted-foreground">Mevcut versiyon</p>
            </div>
            <span className="text-sm font-mono">v1.25</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold">Veritabanı</p>
              <p className="text-xs text-muted-foreground">Bağlantı durumu</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-buy">
              <CheckCircle className="h-4 w-4" /> Aktif
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold">Güvenlik</p>
              <p className="text-xs text-muted-foreground">RLS politikaları</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-buy">
              <CheckCircle className="h-4 w-4" /> Aktif
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
