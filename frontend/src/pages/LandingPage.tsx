import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    title: "Analyse de documents",
    description:
      "Importez vos PDFs, cours, TDs et examens. L'assistant les lit et répond avec précision.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    title: "Réponses sourcées",
    description:
      "Chaque réponse cite le passage exact de vos documents. Vérifiez toujours la source.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    title: "Plusieurs modèles IA",
    description:
      "Cerebras pour la vitesse, Gemini pour le contexte long. Vous choisissez selon vos besoins.",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-brand-navy font-sans">
      {/* ── Sticky nav ── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 transition-all duration-300 ${
          scrolled
            ? "py-3 bg-brand-navy/90 backdrop-blur-md border-b border-white/8 shadow-soft"
            : "py-5 bg-transparent border-b border-transparent"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-sm rotate-45 bg-brand-blue flex-shrink-0" />
          <span className="text-white font-bold text-sm tracking-tight">
            ENSET AI
          </span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Se connecter
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <img
          src="/images/school-scene.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient overlay — keeps brand navy feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/75 via-brand-navy/60 to-brand-navy/90" />

        {/* Content */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center gap-7 px-6 text-center max-w-2xl"
        >
          {/* Logo mark */}
          <motion.div variants={fadeUp}>
            <div className="w-16 h-16 rounded-2xl bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center mx-auto backdrop-blur-sm">
              <div className="w-7 h-7 rounded-[5px] rotate-45 bg-brand-blue" />
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUp} className="space-y-3">
            <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight leading-none">
              ENSET AI
            </h1>
            <p className="text-xl text-white/60 leading-relaxed">
              Votre assistant académique intelligent
            </p>
            <p className="text-sm text-white/35 max-w-sm mx-auto">
              Analysez vos cours, TDs et examens en conversation naturelle
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login?tab=register")}
              className="px-8 py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-dark transition-colors shadow-elevated"
            >
              Commencer gratuitement
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3 rounded-xl border border-white/20 text-white/70 font-medium text-sm hover:bg-white/5 hover:text-white hover:border-white/30 transition-all"
            >
              Se connecter
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <span className="text-[10px] text-white/25 uppercase tracking-widest">
            Découvrir
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          >
            <svg
              className="w-4 h-4 text-white/25"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── About ENSET ── */}
      <section className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-14">
            {/* School photo */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full md:w-1/2 flex-shrink-0"
            >
              <div className="relative">
                <img
                  src="/images/hero-bg.png"
                  alt="ENSET Mohammedia"
                  className="w-full rounded-2xl shadow-elevated object-cover"
                />
                {/* Badge overlay */}
                <div className="absolute bottom-4 left-4 bg-brand-navy/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10">
                  ENSET Mohammedia
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 rounded-full bg-brand-gold" />
                <span className="text-xs font-semibold uppercase tracking-widest text-brand-gray-text">
                  Notre établissement
                </span>
              </div>
              <h2 className="text-3xl font-bold text-brand-navy leading-tight">
                École Normale Supérieure de l'Enseignement Technique
              </h2>
              <p className="text-brand-gray-text text-sm leading-relaxed">
                L'ENSET Mohammedia forme les ingénieurs pédagogues et les cadres
                techniques de demain. Établissement d'excellence, elle réunit
                des filières d'ingénierie, d'informatique et de génie industriel
                au cœur du Maroc.
              </p>
              <p className="text-brand-gray-text text-sm leading-relaxed">
                ENSET AI est l'assistant intelligent conçu pour accompagner
                étudiants et professeurs dans l'exploration de leurs ressources
                pédagogiques — cours, TDs, examens — en quelques secondes.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  "Ingénierie",
                  "Informatique",
                  "Génie industriel",
                  "Pédagogie",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-brand-blue/8 text-brand-blue border border-brand-blue/15"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-brand-surface-muted py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-brand-blue" />
              <span className="text-xs font-semibold uppercase tracking-widest text-brand-gray-text">
                Fonctionnalités
              </span>
              <div className="w-1 h-5 rounded-full bg-brand-blue" />
            </div>
            <h2 className="text-3xl font-bold text-brand-navy">
              Pourquoi ENSET AI ?
            </h2>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="bg-white border border-brand-gray rounded-2xl p-6 hover:shadow-elevated hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue mb-4">
                  {f.icon}
                </div>
                <p className="text-sm font-semibold text-brand-navy mb-2">
                  {f.title}
                </p>
                <p className="text-xs text-brand-gray-text leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-brand-navy py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto px-6 text-center flex flex-col items-center gap-6"
        >
          <div className="w-12 h-12 rounded-xl bg-brand-blue/20 border border-brand-blue/25 flex items-center justify-center">
            <div className="w-5 h-5 rounded-[4px] rotate-45 bg-brand-blue" />
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Prêt à explorer vos documents ?
          </h2>
          <p className="text-white/45 text-sm max-w-sm leading-relaxed">
            Créez votre compte gratuitement et commencez à interroger vos
            ressources pédagogiques en quelques secondes.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login?tab=register")}
              className="px-8 py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm hover:bg-brand-gold-dark transition-colors shadow-elevated"
            >
              Créer un compte
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-8 py-3 rounded-xl border border-white/15 text-white/60 font-medium text-sm hover:bg-white/5 hover:text-white hover:border-white/25 transition-all"
            >
              Se connecter
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <div className="bg-brand-navy border-t border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm rotate-45 bg-brand-blue/60 flex-shrink-0" />
          <span className="text-xs text-white/30 font-medium">ENSET AI</span>
        </div>
        <p className="text-[11px] text-white/20">ENSET Mohammedia · 2026</p>
      </div>
    </div>
  );
}
