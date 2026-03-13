import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, BarChart3, Headphones, ChevronRight, Globe, Lock, Activity, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";

const features = [
  {
    icon: Zap,
    title: "Hızlı Emir İletimi",
    desc: "Milisaniye düzeyinde emir iletimi ile piyasanın nabzını kaçırmayın.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Shield,
    title: "Güvenli Altyapı",
    desc: "SPK lisanslı, banka düzeyinde şifreleme ile korunan güvenli platform.",
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Canlı Piyasa Verisi",
    desc: "Anlık fiyat akışı ve derinlik verileri ile profesyonel analiz imkânı.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Headphones,
    title: "7/24 Destek",
    desc: "Uzman ekibimiz her an yanınızda, sorularınıza anında çözüm üretin.",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
  },
];

const stats = [
  { label: "Aktif Kullanıcı", value: "10K+", icon: Globe },
  { label: "Güvenlik Seviyesi", value: "A+", icon: Lock },
  { label: "Günlük İşlem", value: "50K+", icon: Activity },
];

const tickers = [
  { symbol: "GARAN", price: "98.40", change: "+2.31%" },
  { symbol: "AKSA", price: "45.12", change: "+1.85%" },
  { symbol: "EREGL", price: "52.70", change: "-0.42%" },
  { symbol: "TOASO", price: "215.60", change: "+3.10%" },
  { symbol: "SASA", price: "67.80", change: "-1.25%" },
  { symbol: "TSKB", price: "23.44", change: "+0.90%" },
];

const terminalItems = [
  { sym: "GARAN", price: "98.40", chg: "+2.31%", up: true },
  { sym: "EREGL", price: "52.70", chg: "-0.42%", up: false },
  { sym: "TOASO", price: "215.60", chg: "+3.10%", up: true },
  { sym: "AKSA", price: "45.12", chg: "+1.85%", up: true },
];

// CSS-only ticker — no framer-motion, no JS repaints
function FloatingTicker() {
  const tickerItems = [...tickers, ...tickers, ...tickers];
  return (
    <div className="relative overflow-hidden py-3 border-y border-white/5">
      <div className="ticker-track flex gap-8 whitespace-nowrap">
        {tickerItems.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-white/50">{t.symbol}</span>
            <span className="text-white/80">{t.price}</span>
            <span className={t.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}>
              {t.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedCounter({ value }: { value: string }) {
  const [displayed, setDisplayed] = useState("0");
  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return <span>{displayed}</span>;
}

export default function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animations after mount
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Memoize sparkline heights so they don't re-randomize on every render
  const sparklines = useMemo(() => {
    return terminalItems.map(() =>
      Array.from({ length: 12 }, () => 20 + Math.random() * 80)
    );
  }, []);

  const baseTransition = "transition-all duration-700 ease-out";
  const hidden = "opacity-0 translate-y-6";
  const shown = "opacity-100 translate-y-0";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#060a14" }}>
      {/* Navbar */}
      <nav className="h-14 md:h-16 flex items-center justify-between px-4 md:px-12 sticky top-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ background: "rgba(6,10,20,0.85)" }}>
        <Link to="/" className="flex items-center gap-2">
          <img src="/marbas-logo.png" alt="Marbaş" className="h-7 w-7 md:h-8 md:w-8 object-contain" />
          <span className="font-bold text-white text-sm md:text-base tracking-tight hidden sm:inline">
            MARBAŞ YATIRIM
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5 text-xs md:text-sm px-2 md:px-3">
              Giriş Yap
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="gap-1 md:gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/20 text-xs md:text-sm px-3 md:px-4">
              Hesap Aç <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Ticker — CSS animation only */}
      <FloatingTicker />

      {/* Hero */}
      <section className="relative py-12 md:py-32 px-4 md:px-12 overflow-hidden">
        {/* Simplified background — fewer blur layers on mobile */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03] hidden md:block"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-[-20%] right-[-10%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full blur-[80px] md:blur-[120px] opacity-20 bg-blue-600" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full blur-[80px] md:blur-[120px] opacity-15 bg-indigo-700 hidden md:block" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-5 md:space-y-8">
            {/* Badge */}
            <div className={`${baseTransition} ${visible ? shown : hidden} inline-flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full border border-white/10 bg-white/5`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] md:text-xs text-white/60 font-medium">Borsa İstanbul Canlı</span>
            </div>

            {/* Heading */}
            <h1 className={`${baseTransition} delay-100 ${visible ? shown : hidden} text-3xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight`}>
              Yatırımlarınızı
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Geleceğe Taşıyın
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`${baseTransition} delay-200 ${visible ? shown : hidden} text-white/50 text-sm md:text-lg max-w-xl leading-relaxed px-2`}>
              Güvenli altyapı, anlık piyasa verileri ve profesyonel araçlarla
              Borsa İstanbul'da yatırım yapmanın modern yolu.
            </p>

            {/* CTA */}
            <div className={`${baseTransition} delay-300 ${visible ? shown : hidden} flex items-center gap-3 md:gap-4`}>
              <Link to="/register">
                <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-xl shadow-blue-600/25 px-6 md:px-8 h-11 md:h-12 text-sm md:text-base">
                  Hemen Başla <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="lg" className="gap-1 text-white/60 hover:text-white hover:bg-white/5 h-11 md:h-12 text-sm md:text-base">
                  Giriş Yap <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className={`${baseTransition} delay-500 ${visible ? shown : hidden} flex items-center gap-6 md:gap-12 pt-6 md:pt-8`}>
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-400" />
                    <span className="text-lg md:text-2xl font-bold text-white font-mono">
                      <AnimatedCounter value={s.value} />
                    </span>
                  </div>
                  <span className="text-[9px] md:text-xs text-white/40 uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal Preview Card */}
          <div
            className={`${baseTransition} delay-[600ms] ${visible ? shown : hidden} mt-10 md:mt-20 rounded-xl md:rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50`}
            style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(6,10,20,0.95) 100%)" }}
          >
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[9px] md:text-[10px] text-white/30 font-mono ml-2">marbas-terminal — live</span>
            </div>
            {/* Terminal content */}
            <div className="p-3 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              {terminalItems.map((t, idx) => (
                <div key={t.sym} className="rounded-lg md:rounded-xl border border-white/5 bg-white/[0.02] p-3 md:p-4 space-y-1.5 md:space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs font-mono text-white/60">{t.sym}</span>
                    <span className={`text-[9px] md:text-[10px] font-mono px-1 md:px-1.5 py-0.5 rounded ${t.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {t.chg}
                    </span>
                  </div>
                  <p className="text-base md:text-lg font-bold font-mono text-white">{t.price}</p>
                  <div className="flex items-end gap-0.5 h-5 md:h-6">
                    {sparklines[idx].map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${t.up ? "bg-emerald-500/30" : "bg-red-500/30"}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 md:py-28 px-4 md:px-12 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-400 font-medium mb-3">
              Özellikler
            </p>
            <h2 className="text-xl md:text-4xl font-bold text-white">
              Profesyonel Yatırım Araçları
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] p-5 md:p-8 hover:border-white/10 hover:bg-white/[0.04] transition-colors duration-300"
              >
                <div className={`h-10 w-10 md:h-11 md:w-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 md:mb-5`}>
                  <f.icon className={`h-4 w-4 md:h-5 md:w-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-semibold text-white text-sm md:text-base mb-1.5 md:mb-2">{f.title}</h3>
                <p className="text-white/40 text-xs md:text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 md:py-20 px-4 md:px-12">
        <div
          className="max-w-4xl mx-auto rounded-2xl md:rounded-3xl border border-white/10 p-8 md:p-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(30,64,175,0.15) 0%, rgba(6,10,20,0.8) 50%, rgba(15,23,42,0.6) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-[200px] md:w-[300px] h-[200px] md:h-[300px] rounded-full blur-[80px] md:blur-[120px] opacity-20 bg-blue-500" />
          <h2 className="text-xl md:text-3xl font-bold text-white mb-3 md:mb-4 relative z-10">
            Yatırıma Başlamaya Hazır mısınız?
          </h2>
          <p className="text-white/40 text-xs md:text-base mb-6 md:mb-8 max-w-lg mx-auto relative z-10">
            Ücretsiz hesabınızı oluşturun, dakikalar içinde işlem yapmaya başlayın.
          </p>
          <Link to="/register" className="relative z-10">
            <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-xl shadow-blue-600/25 px-8 md:px-10 h-11 md:h-12 text-sm md:text-base">
              Ücretsiz Kayıt Ol <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-10 md:pt-12 pb-8 px-4 md:px-12 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 mb-8 md:mb-10">
            {/* Kurumsal */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2.5">
                <img src="/marbas-logo.png" alt="Marbaş" className="h-6 w-6 md:h-7 md:w-7 object-contain" />
                <span className="font-semibold text-white text-xs md:text-sm">MARBAŞ YATIRIM</span>
              </div>
              <p className="text-white/30 text-[11px] md:text-xs leading-relaxed">
                Marbaş Menkul Değerler A.Ş. SPK lisanslı, güvenilir yatırım ortağınız.
              </p>
            </div>

            {/* Hızlı Linkler */}
            <div className="space-y-3 md:space-y-4">
              <h4 className="text-white/60 text-[11px] md:text-xs font-semibold uppercase tracking-wider">Hızlı Erişim</h4>
              <div className="flex flex-col gap-2">
                <Link to="/login" className="text-white/30 text-[11px] md:text-xs hover:text-white/60 transition-colors">Giriş Yap</Link>
                <Link to="/register" className="text-white/30 text-[11px] md:text-xs hover:text-white/60 transition-colors">Kayıt Ol</Link>
              </div>
            </div>

            {/* İletişim */}
            <div className="space-y-3 md:space-y-4">
              <h4 className="text-white/60 text-[11px] md:text-xs font-semibold uppercase tracking-wider">İletişim</h4>
              <div className="flex flex-col gap-2.5 md:gap-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 text-white/30 shrink-0" />
                  <span className="text-white/40 text-[11px] md:text-xs font-mono">+90 (216) 709 33 09</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 text-white/30 shrink-0" />
                  <a href="mailto:info@marbasmenkul.com" className="text-white/40 text-[11px] md:text-xs hover:text-white/60 transition-colors">info@marbasmenkul.com</a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 text-white/30 mt-0.5 shrink-0" />
                  <span className="text-white/40 text-[11px] md:text-xs leading-relaxed">Altunizade Mah. Ord. Prof. Fahrettin Kerim Gökay Cad. Altınyurt İş Merkezi No:20 Kat:3 Üsküdar / İstanbul</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-5 md:pt-6 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
            <span className="text-[10px] text-white/20">
              © {new Date().getFullYear()} Marbaş Menkul Değerler A.Ş. Tüm hakları saklıdır.
            </span>
            <span className="text-[10px] text-white/15">
              SPK Lisanslı Yatırım Kuruluşu
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
