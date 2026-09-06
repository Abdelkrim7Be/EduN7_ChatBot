import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { LandingAssistant } from "../components/LandingAssistant";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

export function LandingPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  return (
    <div className="bg-x-black text-x-white min-h-screen font-sans selection:bg-white/20 antialiased">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-x-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              alt="ENSET AI"
              className="h-8 w-8"
              src="/logo.svg"
            />
            <span className="font-bold text-xl tracking-tighter uppercase">
              ENSET AI
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#about" className="hover:text-gray-400 transition-colors">
              Our Institution
            </a>
            <a href="#features" className="hover:text-gray-400 transition-colors">
              Features
            </a>
            {auth.isAuthenticated ? (
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-white text-black rounded-sm hover:bg-gray-200 transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 bg-white text-black rounded-sm hover:bg-gray-200 transition-colors"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-16">
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
          </div>
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="relative z-10 space-y-6 max-w-3xl"
          >
            <motion.img
              variants={fadeUp}
              alt="Logo"
              className="mx-auto h-20 w-20 mb-8 opacity-90"
              src="/logo.svg"
            />
            <motion.h1
              variants={fadeUp}
              className="text-6xl md:text-8xl font-extrabold tracking-tighter uppercase"
            >
              ENSET AI
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-xl md:text-2xl font-light text-gray-400 tracking-wide"
            >
              Self-hosted academic AI platform
            </motion.p>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 max-w-xl mx-auto text-sm md:text-base"
            >
              Private document analysis for authenticated users,
              with a public assistant limited to approved information.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
            >
              {auth.isAuthenticated ? (
                <button
                  onClick={() => navigate("/")}
                  className="px-10 py-4 bg-white text-black font-bold uppercase text-sm tracking-widest hover:bg-gray-200 transition-all duration-300"
                >
                  Open Chat
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login?tab=register")}
                    className="px-10 py-4 bg-white text-black font-bold uppercase text-sm tracking-widest hover:bg-gray-200 transition-all duration-300"
                  >
                    Start Free
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="px-10 py-4 border border-white text-white font-bold uppercase text-sm tracking-widest hover:bg-white/10 transition-all duration-300"
                  >
                    Sign In
                  </button>
                </>
              )}
            </motion.div>
            <motion.div variants={fadeUp} className="pt-20 animate-bounce">
              <a
                href="#about"
                className="text-xs uppercase tracking-[0.3em] text-gray-500"
              >
                Explore
              </a>
            </motion.div>
          </motion.div>
          <LandingAssistant />
        </section>

        {/* About */}
        <section id="about" className="py-24 border-t border-x-border">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-white opacity-10 blur group-hover:opacity-20 transition duration-500"></div>
              <div className="relative border border-white aspect-video overflow-hidden">
                <img
                  alt="ENS Mohammedia"
                  className="w-full h-full object-cover grayscale brightness-50"
                  src="/assets/enset-campus.png"
                />
                <div className="absolute bottom-4 left-4 bg-black/80 px-3 py-1 border border-white/50 text-[10px] uppercase tracking-widest">
                  ENSET Mohammedia
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="inline-block border-l-2 border-white pl-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Our Institution
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Higher Normal School of Technical Education
              </h2>
              <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>
                  ENSET Mohammedia trains tomorrow's engineering educators and
                  technical leaders. As a school of excellence, it brings together
                  engineering, computer science, and industrial engineering
                  programs in the heart of Morocco.
                </p>
                <p>
                  ENSET AI is deployed as a private platform to help students
                  and professors explore academic resources. The public landing
                  assistant is only a guide for visitors.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                {["Engineering", "Computer Science", "Industrial Engineering", "Teaching"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 border border-x-border text-[10px] uppercase tracking-wider text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-x-black border-t border-x-border">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-4 mb-4">
                <div className="h-px w-8 bg-white"></div>
                <span className="text-xs font-bold uppercase tracking-[0.4em]">
                  Features
                </span>
                <div className="h-px w-8 bg-white"></div>
              </div>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Why ENSET AI?
              </h2>
            </motion.div>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              {/* Feature 1 */}
              <motion.div variants={fadeUp} className="border border-white bg-black p-8 flex flex-col gap-6 hover:bg-[#111111] transition-all">
                <div className="w-12 h-12 border border-white flex items-center justify-center">
                  <svg
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" x2="8" y1="13" y2="13"></line>
                    <line x1="16" x2="8" y1="17" y2="17"></line>
                    <line x1="10" x2="8" y1="9" y2="9"></line>
                  </svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tight">
                    Document Analysis
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Upload your PDFs, courses, assignments, and exams. The
                    assistant reads them and answers precisely.
                  </p>
                </div>
              </motion.div>

              {/* Feature 2 */}
              <motion.div variants={fadeUp} className="border border-white bg-black p-8 flex flex-col gap-6 hover:bg-[#111111] transition-all">
                <div className="w-12 h-12 border border-white flex items-center justify-center">
                  <svg
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="m9 11 3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tight">
                    Cited Answers
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Every answer cites the exact passage from your documents.
                    Always verify the source.
                  </p>
                </div>
              </motion.div>

              {/* Feature 3 */}
              <motion.div variants={fadeUp} className="border border-white bg-black p-8 flex flex-col gap-6 hover:bg-[#111111] transition-all">
                <div className="w-12 h-12 border border-white flex items-center justify-center">
                  <svg
                    fill="none"
                    height="24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path d="m13 2-2 10h9L11 22l2-10H4l9-10z"></path>
                  </svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tight">
                    Multiple AI Models
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Models are configured at the platform level. Visitors use
                    the public assistant without seeing or choosing the model.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 border-t border-x-border bg-[#050505]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto px-4 text-center space-y-10"
          >
            <img
              alt="Logo"
              className="mx-auto h-12 w-12 opacity-50"
              src="/logo.svg"
            />
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
              Ready to explore your documents?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Create your free account and start querying your academic
              resources in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={() => navigate("/login?tab=register")}
                className="px-12 py-5 bg-white text-black font-bold uppercase text-sm tracking-widest hover:bg-gray-200 transition-all"
              >
                Create Account
              </button>
              <button
                onClick={() => navigate("/login")}
                className="px-12 py-5 border border-white text-white font-bold uppercase text-sm tracking-widest hover:bg-white/10 transition-all"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-x-border">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <img
              alt="ENSET AI"
              className="h-6 w-6"
              src="/logo.svg"
            />
            <span className="text-sm font-bold uppercase tracking-tighter">
              ENSET AI
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-medium text-center">
            © 2026 ENSET AI. All rights reserved
          </div>
          <div className="flex gap-6 text-[10px] uppercase tracking-widest text-gray-500">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
