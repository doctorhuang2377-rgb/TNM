type CancerType = 'lung' | 'esophageal' | 'thymic';

type ExtractResult =
  | { extractedAnswers: Record<string, any>; reasoning: string; confidence: number }
  | { error: string };

function parseSizeToCm(text: string) {
  const candidates: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s*(cm|厘米|mm|毫米)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const v = Number(m[1]);
    if (!Number.isFinite(v)) continue;
    const unit = m[2].toLowerCase();
    candidates.push(unit === 'mm' || unit === '毫米' ? v / 10 : v);
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function findTNM(text: string) {
  const t = text.match(/\bT\s*([0-4](?:[abc])?|is)\b/i)?.[1] ?? null;
  const n = text.match(/\bN\s*([0-3])\b/i)?.[1] ?? null;
  const m = text.match(/\bM\s*(0|1[abc]?)\b/i)?.[1] ?? null;
  return { t, n, m };
}

export function extractFromReportText(type: CancerType, text: string): ExtractResult {
  const raw = text || '';
  const normalized = raw.replace(/[，。；：]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return { error: '报告文本为空' };

  const extractedAnswers: Record<string, any> = {};
  const { t, n, m } = findTNM(normalized);
  const sizeCm = parseSizeToCm(normalized);

  if (type === 'lung') {
    if (sizeCm) extractedAnswers.t_size = Number(sizeCm.toFixed(2));
    if (t) {
      if (t.toLowerCase() === 'is') extractedAnswers.t_invasion = '局限于肺泡内';
      if (t === '4') extractedAnswers.t_invasion = '侵犯纵隔器官(心/大血管/食管)';
    }
    if (n) {
      const map: Record<string, string> = {
        '0': 'N0: 无淋巴结转移',
        '1': 'N1: 同侧支气管或肺门淋巴结',
        '2': 'N2: 同侧纵隔或隆突下淋巴结',
        '3': 'N3: 对侧纵隔、对侧肺门或锁骨上淋巴结',
      };
      extractedAnswers.n_status = map[n];
    }
    if (m) {
      const map: Record<string, string> = {
        '0': 'M0: 无远处转移',
        '1a': 'M1a: 胸膜结节或恶性胸水',
        '1b': 'M1b: 单一肺外器官单病灶转移',
        '1c': 'M1c: 单一肺外多个转移或多器官转移',
        '1': 'M1b: 单一肺外器官单病灶转移',
      };
      extractedAnswers.m_status = map[m.toLowerCase()];
    }
  }

  if (type === 'esophageal') {
    if (t) {
      const map: Record<string, string> = {
        '1': '黏膜层 (T1)',
        '2': '肌层 (T2)',
        '3': '纤维外膜 (T3)',
        '4a': '邻近结构-可切除(T4a)',
        '4b': '邻近结构-不可切除(T4b)',
        '4': '邻近结构-可切除(T4a)',
      };
      extractedAnswers.t_invasion = map[t.toLowerCase()];
    }
    if (n) {
      const map: Record<string, string> = {
        '0': 'N0: 0个',
        '1': 'N1: 1-2个',
        '2': 'N2: 3-6个',
        '3': 'N3: >=7个',
      };
      extractedAnswers.n_count = map[n];
    }
    if (m) extractedAnswers.m_status = m === '0' ? 'M0: 无远程转移' : 'M1: 有远处转移';
  }

  if (type === 'thymic') {
    if (t) {
      const map: Record<string, string> = {
        '1': 'T1: 局限于胸腺',
        '2': 'T2: 侵犯心包',
        '3': 'T3: 侵犯肺/无名静脉/膈神经等',
        '4': 'T4: 侵犯心脏/大血管',
      };
      extractedAnswers.t_invasion = map[t.toLowerCase()];
    }
    if (n) {
      const map: Record<string, string> = {
        '0': 'N0: 无',
        '1': 'N1: 前/纵隔淋巴结',
        '2': 'N2: 深部纵隔或锁骨上',
      };
      extractedAnswers.n_status = map[n];
    }
    if (m) {
      const map: Record<string, string> = {
        '0': 'M0: 无',
        '1a': 'M1a: 胸膜或心包结节',
        '1b': 'M1b: 肺内或远程器官转移',
        '1': 'M1b: 肺内或远程器官转移',
      };
      extractedAnswers.m_status = map[m.toLowerCase()];
    }
  }

  const keys = Object.keys(extractedAnswers);
  if (!keys.length) return { error: '未在文本中识别到 TNM 关键字（例如 T2N1M0 或 “肿瘤最大径 2.5cm”）' };

  const confidence = Math.min(0.95, Math.max(0.4, keys.length / 5));
  const reasoning = `从文本中识别到：${[t ? `T${t}` : null, n ? `N${n}` : null, m ? `M${m}` : null, sizeCm ? `size≈${sizeCm.toFixed(2)}cm` : null].filter(Boolean).join('，')}`;
  return { extractedAnswers, reasoning, confidence };
}
