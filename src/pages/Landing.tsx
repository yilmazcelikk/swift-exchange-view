import { useEffect, useRef } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { checkGate } from "@/lib/gatekeeper";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  Globe,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import AppLogo from "@/components/AppLogo";

/* ── Animated grid background ── */
function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      t += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gap = 60;
      const cols = Math.ceil(canvas.width / gap) + 1;
      const rows = Math.ceil(canvas.height / gap) + 1;

      // Vertical lines
      for (let i = 0; i < cols; i++) {
        const x = i * gap;
        const alpha = 0.04 + 0.02 * Math.sin(t + i * 0.3);
        ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let j = 0; j < rows; j++) {
        const y = j * gap;
        const alpha = 0.04 + 0.02 * Math.sin(t + j * 0.3);
        ctx.strokeStyle = `rgba(59,130,246,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Glowing dots at intersections
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * gap;
          const y = j * gap;
          const pulse = Math.sin(t * 2 + i * 0.5 + j * 0.7);
          if (pulse > 0.7) {
            const r = 1.5 + pulse * 1.5;
            const alpha = 0.15 + pulse * 0.25;
            ctx.fillStyle = `rgba(59,130,246,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

/* ── Floating particles ── */
function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          initial={{
            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
          }}
          animate={{
            y: [null, -100, (typeof window !== "undefined" ? window.innerHeight : 800) + 100],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 12,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/* ── Feature card ── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: any;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className="group relative p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-500"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

/* ── Stat counter ── */
function StatItem({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-bold text-primary mb-1 font-mono">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}

/* ── Main Landing ── */
export default function Landing() {
  const [sp] = useSearchParams();
  const gateOpen = checkGate(sp);

  if (!gateOpen) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <GridBackground />
      <FloatingParticles />

      {/* ─ Navbar ─ */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <AppLogo className="h-9 w-auto" />
        <div className="flex items-center gap-3">
          <Link
            to="/login?go=1"
            className="px-5 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Giriş Yap
          </Link>
          <Link
            to="/register?go=1"
            className="px-5 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Hesap Aç
          </Link>
        </div>
      </nav>

      {/* ─ Hero ─ */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24 md:pt-28 md:pb-36 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border border-primary/20 bg-primary/5 text-primary">
            <Zap className="w-3.5 h-3.5" />
            Yeni Nesil Yatırım Teknolojisi
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6"
        >
          <span className="text-foreground">Geleceğin </span>
          <span className="bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Yatırım Platformu
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
        >
          Gelişmiş analiz araçları, anlık piyasa verileri ve güvenli altyapı ile
          profesyonel yatırım deneyimi.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            to="/register?go=1"
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
          >
            Hemen Başla
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login?go=1"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border text-foreground font-semibold text-base hover:bg-card/80 transition-all"
          >
            Giriş Yap
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-16"
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground/50 animate-bounce" />
        </motion.div>
      </section>

      {/* ─ Stats ─ */}
      <section className="relative z-10 py-16 border-y border-border/30">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatItem value="900+" label="Finansal Enstrüman" delay={0} />
          <StatItem value="7/24" label="Piyasa Erişimi" delay={0.1} />
          <StatItem value="<1s" label="İşlem Hızı" delay={0.2} />
          <StatItem value="256-bit" label="SSL Şifreleme" delay={0.3} />
        </div>
      </section>

      {/* ─ Features ─ */}
      <section className="relative z-10 py-24 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Neden Bizi Tercih Etmelisiniz?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Son teknoloji altyapımız ile güvenli ve hızlı yatırım deneyimi sunuyoruz.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={BarChart3}
            title="Gelişmiş Grafikler"
            description="Profesyonel grafik araçları ile teknik analiz yapın, trendleri takip edin."
            delay={0}
          />
          <FeatureCard
            icon={Zap}
            title="Anlık İşlem"
            description="Milisaniye düzeyinde işlem hızı ile fırsatları kaçırmayın."
            delay={0.1}
          />
          <FeatureCard
            icon={Shield}
            title="Güvenli Altyapı"
            description="Üst düzey şifreleme ve çok katmanlı güvenlik protokolleri."
            delay={0.2}
          />
          <FeatureCard
            icon={Globe}
            title="Global Piyasalar"
            description="Forex, emtia, hisse senedi ve kripto para piyasalarına tek platformdan erişin."
            delay={0.3}
          />
          <FeatureCard
            icon={TrendingUp}
            title="Risk Yönetimi"
            description="Stop-loss, take-profit ve otomatik pozisyon yönetimi araçları."
            delay={0.4}
          />
          <FeatureCard
            icon={Shield}
            title="7/24 Destek"
            description="Uzman ekibimiz her zaman yanınızda. Sorularınıza anında yanıt alın."
            delay={0.5}
          />
        </div>
      </section>

      {/* ─ CTA ─ */}
      <section className="relative z-10 py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-card/50 backdrop-blur-sm"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Yatırıma Başlamaya Hazır mısınız?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Hemen ücretsiz hesabınızı oluşturun ve profesyonel yatırım araçlarına erişin.
          </p>
          <Link
            to="/register?go=1"
            className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
          >
            Ücretsiz Hesap Oluştur
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* ─ Footer ─ */}
      <footer className="relative z-10 border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo className="h-6 w-auto opacity-60" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Tüm hakları saklıdır.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/login?go=1" className="hover:text-foreground transition-colors">
              Giriş
            </Link>
            <Link to="/register?go=1" className="hover:text-foreground transition-colors">
              Kayıt
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
