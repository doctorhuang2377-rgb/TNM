import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Activity, BookOpen, ChevronRight, Menu, X, HeartPulse, BrainCircuit } from 'lucide-react';
import Home from './views/Home';
import Staging from './views/Staging';
import Knowledge from './views/Knowledge';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lang, setLang] = useState<'cn' | 'en'>('cn');

  const t = {
    cn: {
      home: "首页",
      staging: "分期中枢",
      guide: "指南助手",
      footerMsg: "守护胸部健康，从早筛开始",
      footerWarning: "本系统仅提供科研参考与风险评估建议，不能替代正式医疗诊断。如有不适，请务必前往医院就诊。",
    },
    en: {
      home: "Home",
      staging: "Staging Hub",
      guide: "Guide Assistant",
      footerMsg: "Protecting Thoracic Health Starts with Early Screening",
      footerWarning: "This system provides research reference and risk assessment suggestions only. It cannot replace formal medical diagnosis.",
    }
  }[lang];

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link id="nav-logo" to="/" className="flex items-center space-x-2 group">
                <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-700 transition-colors">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">胸外智分 <span className="text-sm font-medium text-slate-400">TNM</span></span>
              </Link>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center space-x-8">
                <Link id="nav-home" to="/" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">{t.home}</Link>
                <Link id="nav-staging" to="/staging" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">{t.staging}</Link>
                <Link id="nav-knowledge" to="/knowledge" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">{t.guide}</Link>
                
                {/* Language Toggle */}
                <button 
                  onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
                  className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-200 shadow-sm"
                >
                  {lang === 'cn' ? 'English' : '中文'}
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center space-x-4">
                <button 
                  onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
                  className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500"
                >
                  {lang === 'cn' ? 'EN' : 'CN'}
                </button>
                <button 
                  id="mobile-menu-btn"
                  className="p-2 rounded-md text-slate-600"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
              >
                <div className="px-4 py-4 space-y-3">
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-slate-600 font-medium">{t.home}</Link>
                  <Link to="/staging" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-slate-600 font-medium">{t.staging}</Link>
                  <Link to="/knowledge" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-slate-600 font-medium">{t.guide}</Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/staging" element={<Staging />} />
            <Route path="/knowledge" element={<Knowledge />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-top border-slate-200 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-2 items-center mb-4">
              <HeartPulse className="w-5 h-5 text-red-500" />
              <span className="font-semibold text-slate-700">{t.footerMsg}</span>
            </div>
            <p className="text-slate-400 text-sm">
              {t.footerWarning}
            </p>
            <div className="mt-8 pt-8 border-t border-slate-100 text-xs text-slate-300">
              © 2026 Thoracic Sentinel | Global Early Detection System
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
