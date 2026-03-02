import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Hızlı Emir İletimiyle İşlem Yap",
    desc: "Anlık piyasa verilerine erişin ve hızla emir gönderin.",
  },
  {
    icon: Shield,
    title: "Güvenli Yatırım",
    desc: "SPK lisanslı, güvenilir altyapı ile yatırımlarınızı koruyun.",
  },
  {
    icon: BarChart3,
    title: "Ücretsiz Canlı Veri Takibi",
    desc: "Piyasa verilerini canlı olarak takip edin, portföyünüzü anlık izleyin.",
  },
  {
    icon: TrendingUp,
    title: "Kaldıraçlı İşlem",
    desc: "Forex ve emtia piyasalarında kaldıraçlı işlem fırsatlarından yararlanın.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="h-16 border-b border-border bg-card flex items-center justify-between px-6 md:px-12 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <img src="/tacirler-logo.png" alt="Tacirler Yatırım" className="h-8 w-8 object-contain" />
          <span className="font-bold text-foreground text-lg tracking-tight hidden sm:inline">TACİRLER</span>
        </Link>
        <Link to="/login">
          <Button size="sm" className="gap-1.5">
            Yatırımcı Girişi <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section
        className="relative py-20 md:py-28 px-6 md:px-12"
        style={{ background: "linear-gradient(135deg, #0a1628 0%, #122044 50%, #1a3068 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 right-10 w-80 h-80 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
          <div className="absolute bottom-20 left-10 w-64 h-64 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #1d4ed8 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              Tacirler Yatırım ile<br />
              Birikimlerinizi Yönetin
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-lg leading-relaxed">
              Güvenli ve hızlı al-sat işlemleri ile piyasaları yakından takip edin. Tek platformda tüm yatırım ihtiyaçlarınızı karşılayın.
            </p>
            <Link to="/register">
              <Button size="lg" className="gap-2 mt-2">
                Kayıt Ol <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Info Card */}
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs">Tacirler Yatırım</p>
                <p className="text-white font-bold text-sm">1991'den Beri</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">₺8.74</span>
              <span className="text-xs text-white/50">Milyar Aktif</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div>
                <p className="text-white/50 text-[10px]">Öz Varlık</p>
                <p className="text-white text-xs font-semibold font-mono">₺3.61 Milyar</p>
              </div>
              <div>
                <p className="text-white/50 text-[10px]">Kuruluş</p>
                <p className="text-white text-xs font-semibold font-mono">1991</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-12">
            Neden Tacirler Yatırım?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 px-6 md:px-12 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/tacirler-logo.png" alt="Tacirler" className="h-6 w-6 object-contain" />
            <span className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Tacirler Yatırım Menkul Değerler A.Ş. Tüm hakları saklıdır.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Giriş Yap</Link>
            <Link to="/register" className="hover:text-foreground transition-colors">Kayıt Ol</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
