import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2, FileText, Activity, Layers, Target, Upload, Camera, Sparkles, X, AlertCircle, CheckCircle2, Wifi, WifiOff, History, Save } from 'lucide-react';
import { STAGING_CONFIG } from '../constants';
import { extractParamsFromReport, clearStoredGeminiApiKey, getStoredGeminiApiKey, hasGeminiApiKey, setStoredGeminiApiKey } from '../services/geminiService';
import { extractFromReportText } from '../agents/reportTextExtractor';
import { formatStagingReport, runStagingAgent } from '../agents/stagingAgent';

export default function Staging() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialType = searchParams.get('type') || 'lung';

  const [currentType, setCurrentType] = useState<string>(initialType);
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem(`draft_${initialType}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('staging_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiKeyDraft, setApiKeyDraft] = useState(() => getStoredGeminiApiKey() || '');
  
  // Extraction state
  const [reportText, setReportText] = useState('');
  const [reportImages, setReportImages] = useState<{data: string, mimeType: string}[]>([]);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answersRef = useRef<Record<string, any>>(answers);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(`draft_${currentType}`, JSON.stringify(answers));
  }, [answers, currentType]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    localStorage.setItem('staging_history', JSON.stringify(history));
  }, [history]);

  const config = STAGING_CONFIG.find(c => c.id === currentType) || STAGING_CONFIG[0];
  
  // Combine all params into a flat list for stepping
  const allParams = [...config.params.T, ...config.params.N, ...config.params.M];
  const [step, setStep] = useState(0);

  const progress = ((step + 1) / allParams.length) * 100;

  const handleAnswer = (paramId: string, val: any) => {
    setAnswers(prev => {
      const next = { ...prev, [paramId]: val };
      answersRef.current = next;
      return next;
    });
  };

  const handleNext = () => {
    if (step < allParams.length - 1) {
      setStep(step + 1);
    } else {
      submitStaging();
    }
  };

  const submitStaging = async () => {
    const missingIndex = allParams.findIndex(p => {
      const v = answersRef.current[p.id];
      return v === undefined || v === '';
    });
    if (missingIndex !== -1) {
      setStep(missingIndex);
      alert('分期需要补全 T/N/M 参数后才能计算。已自动跳转到缺失项。');
      return;
    }
    setIsAnalyzing(true);
    const finalAnswers = answersRef.current;
    const r = runStagingAgent(currentType as any, finalAnswers);
    const summary = formatStagingReport(currentType as any, r);
    setResult(summary);
    setHistory(prev => [{
      id: Date.now(),
      type: currentType,
      answers: { ...finalAnswers },
      result: summary,
      date: new Date().toLocaleString()
    }, ...prev].slice(0, 10));
    setIsAnalyzing(false);
    localStorage.removeItem(`draft_${currentType}`);
  };

  const compressImage = (file: File) => {
    return new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('读取图片失败'));
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const img = new Image();
        img.onerror = () => reject(new Error('图片解码失败（可能是不支持的格式，例如 HEIC）'));
        img.onload = () => {
          const maxSide = 1280;
          const w = img.width || 1;
          const h = img.height || 1;
          const scale = Math.min(1, maxSide / Math.max(w, h));
          const tw = Math.max(1, Math.round(w * scale));
          const th = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement('canvas');
          canvas.width = tw;
          canvas.height = th;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('无法处理图片'));
          ctx.drawImage(img, 0, 0, tw, th);
          const out = canvas.toDataURL('image/jpeg', 0.82);
          const base64 = out.split(',')[1] || '';
          resolve({ data: base64, mimeType: 'image/jpeg' });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const list = Array.from(files);
    const remaining = Math.max(0, 6 - reportImages.length);
    const selected = list.slice(0, remaining);
    if (selected.length < list.length) {
      alert('最多支持 6 张截图。请分批识别，或优先上传关键页面。');
    }
    Promise.allSettled(selected.map(compressImage)).then(results => {
      const ok = results
        .filter((r): r is PromiseFulfilledResult<{ data: string; mimeType: string }> => r.status === 'fulfilled')
        .map(r => r.value);
      const failed = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason?.message || String(r.reason));
      if (failed.length) {
        alert(`部分图片处理失败：\n${failed.join('\n')}`);
      }
      if (ok.length) {
        setReportImages(prev => [...prev, ...ok]);
      }
    });
  };

  const runExtraction = async () => {
    if (!isOnline) {
      if (!reportText) {
        alert('离线模式下仅支持“粘贴报告文字内容”的本地提取；截图识别需要联网与 API Key。');
        return;
      }
    }
    if (!reportText && reportImages.length === 0) return;
    setIsExtracting(true);

    let merged: any = null;

    if (reportText) {
      const local = extractFromReportText(currentType as any, reportText);
      if (!('error' in local)) {
        merged = local;
        setAnswers(prev => ({ ...prev, ...local.extractedAnswers }));
        setExtractionResult(local);
      }
    }

    const canUseAi = isOnline && hasGeminiApiKey() && reportImages.length > 0;
    if (canUseAi) {
      const extracted = await extractParamsFromReport(config, reportText, reportImages);
      if (extracted && extracted.error) {
        alert(`截图智能提取失败：${extracted.error}`);
      } else if (extracted && extracted.extractedAnswers) {
        merged = extracted;
        setAnswers(prev => ({ ...prev, ...extracted.extractedAnswers }));
        setExtractionResult(extracted);
      }
    } else if (reportImages.length > 0 && !hasGeminiApiKey()) {
      alert('已做本地文字提取；截图识别需要联网且配置 Gemini API Key。');
    }

    if (!merged) {
      alert('无法智能提取。建议：粘贴包含 T/N/M 的文字（如 T2N1M0），或上传更清晰截图并配置 Key。');
    }
    setIsExtracting(false);
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    setExtractionResult(null);
    setReportImages([]);
    setReportText('');
    localStorage.removeItem(`draft_${currentType}`);
  };

  if (result) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto"
      >
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="bg-indigo-700 p-8 text-white flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">临床分期与决策建议</h2>
              <p className="opacity-80 text-sm mt-1">评估模型：Thoracic Sentinel AI v1.0</p>
            </div>
            <Activity className="w-10 h-10 opacity-30" />
          </div>
          
          <div className="p-8">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 text-indigo-900 shadow-inner">
              <div className="prose prose-indigo max-w-none whitespace-pre-wrap leading-relaxed font-medium">
                {result}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-sm">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block mb-1">分期标准</span>
                    <span className="text-slate-700">第八版 AJCC 胸部肿瘤分期手册</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-bold block mb-1">免责申明</span>
                    <span className="text-slate-700">仅供临床辅助参考，最终诊断请以病理及专家组结论为准。</span>
                </div>
            </div>

            <div className="flex gap-4">
                <button 
                  onClick={reset}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                >
                  重新录入参数
                </button>
                <button 
                  onClick={() => navigate('/knowledge')}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                >
                  查看相关指南
                </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentParam = allParams[step];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Offline Alert */}
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center space-x-3 text-amber-700 shadow-sm"
        >
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold">离线模式已激活</span>
            <p className="opacity-80">您可以继续录入参数，结果将保存在本地。重新连接网络后可生成 AI 报告。</p>
          </div>
        </motion.div>
      )}

      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">分期智能中枢</h1>
          <p className="text-slate-500 mt-1">支持手动录入与 AI 报告自动识别</p>
        </div>
        <div className="flex p-1 bg-slate-200 rounded-2xl">
          {STAGING_CONFIG.map(c => (
            <button
              key={c.id}
              onClick={() => {
                setCurrentType(c.id);
                setStep(0);
                // Try load draft for this type
                const saved = localStorage.getItem(`draft_${c.id}`);
                setAnswers(saved ? JSON.parse(saved) : {});
              }}
              className={`py-2 px-6 rounded-xl text-sm font-bold transition-all ${
                currentType === c.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Extraction & History Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold">AI 报告识别</h3>
              </div>
              {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-slate-400" />}
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Gemini API Key</span>
                  <span className={`text-[10px] font-bold ${hasGeminiApiKey() ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {hasGeminiApiKey() ? '已配置' : '未配置'}
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="粘贴你的 Gemini API Key（仅保存在本机浏览器）"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const v = apiKeyDraft.trim();
                      if (!v) return;
                      setStoredGeminiApiKey(v);
                      alert('已保存 API Key。');
                    }}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => {
                      clearStoredGeminiApiKey();
                      setApiKeyDraft('');
                      alert('已清除 API Key。');
                    }}
                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
                  >
                    清除
                  </button>
                </div>
              </div>

              <div 
                onClick={() => isOnline && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group ${
                  isOnline ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50' : 'border-slate-100 bg-slate-50 opacity-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileUpload} 
                  disabled={!isOnline}
                />
                <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-100 transition-colors">
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-700">
                  {isOnline ? '点击上传报告截图' : '离线模式下识别不可用'}
                </span>
                <p className="text-xs text-slate-400 mt-1">支持多张截图合并分析</p>
              </div>

              {reportImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {reportImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={`data:${img.mimeType};base64,${img.data}`} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                      <button 
                        onClick={() => setReportImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea 
                placeholder="或直接粘贴报告文字内容..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-indigo-500 text-sm transition-all resize-none"
              />

              <button 
                onClick={runExtraction}
                disabled={isExtracting || (!reportText && reportImages.length === 0) || !isOnline}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
              >
                {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                <span>一键提取 TNM 建议</span>
              </button>
            </div>
          </div>

          {/* History Panel */}
          {history.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 text-slate-700">
                <History className="w-5 h-5" />
                <h3 className="font-bold text-sm">本地分期历史 (仅本机)</h3>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {history.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setResult(item.result)}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:border-indigo-300 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-indigo-600">{STAGING_CONFIG.find(c => c.id === item.type)?.title}</span>
                      <span className="text-[10px] text-slate-400">{item.date}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                       {Object.entries(item.answers).map(([k, v]) => (
                         <span key={k} className="text-[9px] bg-white px-1 py-0.5 rounded border border-slate-200">{k}:{String(v)}</span>
                       ))}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 group-hover:text-slate-800">点击查看此报告结果</p>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => {
                  if(confirm('确定要清除所有本地分期历史吗？')) setHistory([]);
                }}
                className="text-[10px] text-rose-400 hover:text-rose-600 font-bold"
              >
                清空历史
              </button>
            </div>
          )}
        </div>

        {/* Right Col: Manual Parameter Entry / Stepper */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100">
              <motion.div 
                className="h-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-8 md:p-12">
              {isAnalyzing ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                  <Loader2 className="w-16 h-16 text-indigo-500 animate-spin" />
                  <div>
                    <h3 className="text-2xl font-bold">分期计算中...</h3>
                    <p className="text-slate-400 mt-2">AI 正在根据录入的 TNM 参数进行多维逻辑核算</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest text-white ${
                              currentParam.category === 'T' ? 'bg-rose-500' : 
                              currentParam.category === 'N' ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}>
                              {currentParam.category} 分类
                          </span>
                          <span className="text-slate-300 font-medium">指标 {step + 1} / {allParams.length}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Save className="w-3 h-3" />
                        <span className="text-[10px]">实时暂存</span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-3xl font-bold leading-tight">{currentParam.text}</h2>
                      <p className="text-slate-400 mt-2 text-lg">请录入临床观察或影像学检查结果</p>
                    </div>

                    <div className="space-y-4">
                      {currentParam.type === 'select' && (
                        <div className="space-y-3">
                          {currentParam.options?.map(opt => (
                            <button
                              key={opt}
                              onClick={() => {
                                handleAnswer(currentParam.id, opt);
                                // Auto next for select if it's not numbers
                                setTimeout(handleNext, 300);
                              }}
                              className={`w-full p-5 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between ${
                                answers[currentParam.id] === opt 
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 shadow-md' 
                                  : 'border-slate-100 bg-slate-50 hover:border-slate-300 text-slate-600'
                              }`}
                            >
                            <div className="flex items-center space-x-3">
                              <span>{opt}</span>
                              {extractionResult?.extractedAnswers?.[currentParam.id] === opt && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-500 text-[10px] rounded-md flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>AI 建议</span>
                                </span>
                              )}
                            </div>
                              {answers[currentParam.id] === opt && <Layers className="w-5 h-5" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {currentParam.type === 'number' && (
                        <div className="space-y-2">
                          <input 
                            type="number"
                            id={`input-${currentParam.id}`}
                            autoFocus
                            placeholder={currentParam.placeholder}
                            value={answers[currentParam.id] || ''}
                            onChange={(e) => handleAnswer(currentParam.id, e.target.value)}
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 focus:outline-none text-2xl font-bold transition-all"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                      <button 
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        className="flex items-center space-x-2 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors font-bold"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        <span>上一个指标</span>
                      </button>
                      <button 
                        id="submit-param"
                        onClick={handleNext}
                        disabled={answers[currentParam.id] === undefined || answers[currentParam.id] === ''}
                        className={`px-12 py-5 font-bold rounded-2xl flex items-center space-x-2 transition-all shadow-xl active:scale-95 ${
                          !isOnline && step === allParams.length - 1
                            ? 'bg-amber-100 text-amber-600 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200'
                        }`}
                      >
                        {(!isOnline && step === allParams.length - 1) ? (
                          <>
                            <WifiOff className="w-5 h-5" />
                            <span>连网后分期</span>
                          </>
                        ) : (
                          <>
                            <span>{step === allParams.length - 1 ? '一键分期' : '确认并继续'}</span>
                            <ChevronRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
