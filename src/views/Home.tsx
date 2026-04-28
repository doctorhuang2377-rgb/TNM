import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Activity, BrainCircuit, BookOpen, ChevronRight, Wind, Target, Stethoscope } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      title: '肺癌 TNM 分期',
      icon: <Wind className="w-6 h-6 text-indigo-500" />,
      desc: '基于 AJCC 第 8 版标准的肺癌临床与病理分期辅助。',
      target: '/staging?type=lung'
    },
    {
      title: '食管癌分期',
      icon: <Target className="w-6 h-6 text-emerald-500" />,
      desc: '涵盖食管鳞癌及腺癌的侵犯深度与淋巴结分级。',
      target: '/staging?type=esophageal'
    },
    {
      title: '胸腺肿瘤评估',
      icon: <Stethoscope className="w-6 h-6 text-amber-500" />,
      desc: '适用于胸腺瘤及胸腺癌的最新 TNM 系统。',
      target: '/staging?type=thymic'
    }
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-indigo-950 text-white p-8 md:p-16">
        <div className="max-w-2xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              胸部肿瘤 <br />
              <span className="text-indigo-400">智能分期辅助系统</span>
            </h1>
            <p className="text-indigo-200 text-lg mb-8 leading-relaxed">
              为临床医生提供精准的 TNM 分期计算、预后评估及基于 NCCN 指南的治疗方案推荐。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                id="start-staging"
                onClick={() => navigate('/staging')}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
              >
                <span>进入分期中心</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
        
        {/* Background Visual */}
        <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block opacity-10 pointer-events-none">
          <Activity className="w-full h-full text-white p-20 animate-pulse" />
        </div>
      </section>

      {/* Feature Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((f, idx) => (
          <motion.div 
            key={f.title}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigate(f.target)}
            className="group p-8 bg-white border border-slate-200 rounded-3xl hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer"
          >
            <div className="p-3 bg-slate-50 w-fit rounded-2xl mb-6 group-hover:bg-indigo-50 transition-colors">
              {f.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
            <p className="text-slate-500 leading-relaxed mb-6">
              {f.desc}
            </p>
            <div className="flex items-center text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
              <span>立即计算</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </motion.div>
        ))}
      </section>

      {/* Quick Stats/Callout */}
      <section className="bg-sky-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">为什么需要早期筛查？</h2>
          <p className="text-slate-600 leading-relaxed">
            胸部肿瘤在早期往往没有明显症状。通过科学的问卷调研和风险因子权衡，可以帮助高危人群在“黄金期”发现病原，从而将 5 年生存率从不足 20% 提高到 90% 以上。
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-3xl font-bold text-sky-600">85%</div>
            <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">早诊生存率</div>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-3xl font-bold text-sky-600">30s</div>
            <div className="text-xs text-slate-400 mt-1 uppercase font-semibold">快速评估</div>
          </div>
        </div>
      </section>
    </div>
  );
}
