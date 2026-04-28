import { motion } from 'motion/react';
import { BookText, ShieldCheck, Microscope, HeartPulse, Stethoscope, AlertTriangle, Layers, Target } from 'lucide-react';

const GUIDELINES = [
  {
    type: '肺癌指南 (IASLC/AJCC 8th)',
    icon: <Target className="w-6 h-6 text-indigo-500" />,
    keyPoints: [
      'T 分类不仅看大小，还需关注受侵位置（如隆突距离）。',
      'N2 分期对治疗决策至关重要（手术 vs 新辅助）。',
      'M1 分期需结合基因检测（EGFR, ALK）决定靶向方案。'
    ],
    treatment: ['I-II期：根治性手术 + 术后辅助', 'IIIA期：多学科联合诊疗 (MDT)', 'IV期：靶向/免疫/全身化疗'],
    note: 'TNM 分期是决定胸外科手术可行性的第一指标。'
  },
  {
    type: '食管癌分期标准',
    icon: <Layers className="w-6 h-6 text-emerald-500" />,
    keyPoints: [
      '重视 T4b 侵犯范围（主动脉、主支气管、椎体）。',
      '淋巴结个数 (N1-3) 直接决定了术后病理分期。',
      '临床分期 (cTNM) 并不完全等同于术后病理分期 (pTNM)。'
    ],
    treatment: ['早期：内镜下黏膜剥离术 (ESD)', '中晚期：新辅助放化疗 + 食管癌根治', '晚期：姑息支架或营养管支持'],
    note: '对于食管癌，术前 EUS 或 PET-CT 对精准分期有极大帮助。'
  },
  {
    type: '胸腺癌 (MASAOKA/TNM)',
    icon: <ShieldCheck className="w-6 h-6 text-amber-500" />,
    keyPoints: [
      'T1-T3 分期主要取决于对邻近脏器的侵犯。',
      '胸腺肿瘤很少发生淋巴结转移。',
      '分期与切除完整性 (R0) 是最重要的预后因子。'
    ],
    treatment: ['整块切除是首选方案', '难以扩大切除者考虑术前放疗', '晚期或复发者可选用多柔比星联合方案'],
    note: '胸腺肿瘤需注意伴随的自发性气胸或重症肌无力管理。'
  }
];

export default function Knowledge() {
  return (
    <div className="space-y-12">
      <section className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4 italic text-slate-800 tracking-tight">胸部肿瘤临床决策支持中心</h1>
        <p className="text-slate-500">
          整合 AJCC 第 8 版与 NCCN 最新临床指南重点，辅助专业诊断。
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {GUIDELINES.map((info, idx) => (
          <motion.div 
            key={info.type}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col h-full shadow-sm"
          >
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-slate-50 rounded-2xl">
                {info.icon}
              </div>
              <h2 className="text-xl font-bold text-slate-800">{info.type}</h2>
            </div>

            <div className="space-y-8 flex-1">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  分期要点 (Staging Keys)
                </h3>
                <ul className="space-y-3">
                  {info.keyPoints.map(s => (
                    <li key={s} className="flex items-start text-sm text-slate-600">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  规范治疗参考 (Standard Care)
                </h3>
                <ul className="space-y-3">
                  {info.treatment.map(p => (
                    <li key={p} className="flex items-start text-sm font-semibold text-slate-700">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-10 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 italic text-sm text-indigo-700">
              “ {info.note} ”
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
