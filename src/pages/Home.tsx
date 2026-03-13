import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, BarChart3, Headphones, ChevronRight, Globe, Lock, Activity, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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

// Animated grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 bg-blue-600" />
      <div className="absolute bottom-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 bg-indigo-700" />
      <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 bg-cyan-500" />
    </div>
  );
}

// Floating ticker simulation
function FloatingTicker() {
  const tickers = [
    { symbol: "GARAN", price: "98.40", change: "+2.31%" },
    { symbol: "AKSA", price: "45.12", change: "+1.85%" },
    { symbol: "EREGL", price: "52.70", change: "-0.42%" },
    { symbol: "TOASO", price: "215.60", change: "+3.10%" },
    { symbol: "SASA", price: "67.80", change: "-1.25%" },
    { symbol: "TSKB", price: "23.44", change: "+0.90%" },
  ];

  return (
    <div className="relative overflow-hidden py-3 border-y border-white/5">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: [0, -800] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...tickers, ...tickers, ...tickers].map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-white/50">{t.symbol}</span>
            <span className="text-white/80">{t.price}</span>
            <span className={t.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}>
              {t.change}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// Animated counter
function AnimatedCounter({ value }: { value: string }) {
  const [displayed, setDisplayed] = useState("0");
  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return <span>{displayed}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#060a14" }}>
      {/* Navbar */}
      <nav className="h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-50 backdrop-blur-xl border-b border-white/5" style={{ background: "rgba(6,10,20,0.8)" }}>
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/marbas-logo.png" alt="Marbaş" className="h-8 w-8 object-contain" />
          <span className="font-bold text-white text-base tracking-tight hidden sm:inline">
            MARBAŞ YATIRIM
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5">
              Giriş Yap
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-600/20">
              Hesap Aç <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Ticker */}
      <FloatingTicker />

      {/* Hero */}
      <section className="relative py-20 md:py-32 px-6 md:px-12 overflow-hidden">
        <GridBackground />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/60 font-medium">Borsa İstanbul Canlı</span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight"
            >
              Yatırımlarınızı
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Geleceğe Taşıyın
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-white/50 text-base md:text-lg max-w-xl leading-relaxed"
            >
              Güvenli altyapı, anlık piyasa verileri ve profesyonel araçlarla
              Borsa İstanbul'da yatırım yapmanın modern yolu.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex items-center gap-4"
            >
              <Link to="/register">
                <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-xl shadow-blue-600/25 px-8 h-12 text-base">
                  Hemen Başla <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="lg" className="gap-2 text-white/60 hover:text-white hover:bg-white/5 h-12">
                  Giriş Yap <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="flex items-center gap-8 md:gap-12 pt-8"
            >
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xl md:text-2xl font-bold text-white font-mono">
                      <AnimatedCounter value={s.value} />
                    </span>
                  </div>
                  <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Terminal Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 md:mt-20 rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50"
            style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(6,10,20,0.95) 100%)" }}
          >
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] text-white/30 font-mono ml-2">marbas-terminal — live</span>
            </div>
            {/* Terminal content */}
            <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { sym: "GARAN", price: "98.40", chg: "+2.31%", up: true },
                { sym: "EREGL", price: "52.70", chg: "-0.42%", up: false },
                { sym: "TOASO", price: "215.60", chg: "+3.10%", up: true },
                { sym: "AKSA", price: "45.12", chg: "+1.85%", up: true },
              ].map((t) => (
                <div key={t.sym} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-white/60">{t.sym}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${t.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {t.chg}
                    </span>
                  </div>
                  <p className="text-lg font-bold font-mono text-white">{t.price}</p>
                  {/* Mini sparkline bars */}
                  <div className="flex items-end gap-0.5 h-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${t.up ? "bg-emerald-500/30" : "bg-red-500/30"}`}
                        style={{ height: `${20 + Math.random() * 80}%` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 px-6 md:px-12 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-xs uppercase tracking-[0.2em] text-blue-400 font-medium mb-3">
              Özellikler
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-2xl md:text-4xl font-bold text-white">
              Profesyonel Yatırım Araçları
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
              >
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-5`}>
                  <f.icon className={`h-5 w-5 ${f.iconColor}`} />
                </div>
                <h3 className="font-semibold text-white text-base mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto rounded-3xl border border-white/10 p-10 md:p-16 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(30,64,175,0.15) 0%, rgba(6,10,20,0.8) 50%, rgba(15,23,42,0.6) 100%)" }}
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[120px] opacity-20 bg-blue-500" />
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 relative z-10">
            Yatırıma Başlamaya Hazır mısınız?
          </h2>
          <p className="text-white/40 text-sm md:text-base mb-8 max-w-lg mx-auto relative z-10">
            Ücretsiz hesabınızı oluşturun, dakikalar içinde işlem yapmaya başlayın.
          </p>
          <Link to="/register" className="relative z-10">
            <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-xl shadow-blue-600/25 px-10 h-12 text-base">
              Ücretsiz Kayıt Ol <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-12 pb-8 px-6 md:px-12 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Kurumsal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <img src="/marbas-logo.png" alt="Marbaş" className="h-7 w-7 object-contain" />
                <span className="font-semibold text-white text-sm">MARBAŞ YATIRIM</span>
              </div>
              <p className="text-white/30 text-xs leading-relaxed">
                Marbaş Menkul Değerler A.Ş. SPK lisanslı, güvenilir yatırım ortağınız.
              </p>
              {/* Sosyal medya */}
              <div className="flex items-center gap-3 pt-1">
                <a href="https://x.com/maraborsa" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://www.instagram.com/maraborsa" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.youtube.com/@maraborsa" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/maraborsa" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>

            {/* Hızlı Linkler */}
            <div className="space-y-4">
              <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Hızlı Erişim</h4>
              <div className="flex flex-col gap-2.5">
                <Link to="/login" className="text-white/30 text-xs hover:text-white/60 transition-colors">Giriş Yap</Link>
                <Link to="/register" className="text-white/30 text-xs hover:text-white/60 transition-colors">Kayıt Ol</Link>
                <a href="https://www.marbasmenkul.com" target="_blank" rel="noopener noreferrer" className="text-white/30 text-xs hover:text-white/60 transition-colors">Kurumsal Web Sitesi</a>
              </div>
            </div>

            {/* İletişim */}
            <div className="space-y-4">
              <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">İletişim</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-white/40 text-xs font-mono">+90 (216) 709 33 09</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 text-white/30" />
                  <a href="mailto:info@marbasmenkul.com" className="text-white/40 text-xs hover:text-white/60 transition-colors">info@marbasmenkul.com</a>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-3.5 w-3.5 text-white/30 mt-0.5" />
                  <span className="text-white/40 text-xs leading-relaxed">Altunizade Mah. Ord. Prof. Fahrettin Kerim Gökay Cad. Altınyurt İş Merkezi No:20 Kat:3 Üsküdar / İstanbul</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alt çizgi */}
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
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
