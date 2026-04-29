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
  const t = text.match(/(?:^|[^A-Za-z0-9])T\s*([0-4](?:[abc])?|is)(?:\b|[^A-Za-z0-9])/i)?.[1] ?? null;
  const n = text.match(/(?:^|[^A-Za-z0-9])N\s*([0-3])(?:\b|[^A-Za-z0-9])/i)?.[1] ?? null;
  const m = text.match(/(?:^|[^A-Za-z0-9])M\s*(0|1[abc]?)(?:\b|[^A-Za-z0-9])/i)?.[1] ?? null;
  return { t, n, m };
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some(p => p.test(text));
}

function inferM(type: CancerType, text: string) {
  const s = text;

  const negative = [
    /未见.{0,8}(远处|远程)?转移/,
    /未发现.{0,8}(远处|远程)?转移/,
    /无.{0,6}(远处|远程)?转移/,
    /未见转移灶/,
    /未见明确转移/,
    /无转移灶/,
  ];

  const multi = /(多发|多处|多个|弥漫|广泛)/;
  const hasMetaWord = /(转移|种植|播散|继发)/;

  if (type === 'lung') {
    if (includesAny(s, negative)) return '0';
    if (/(恶性胸水|胸膜.{0,6}(结节|转移|种植|播散)|心包.{0,6}(结节|转移|种植|播散)|对侧肺.{0,12}(结节|转移))/i.test(s)) {
      return '1a';
    }
    const organs = ['肝', '骨', '脑', '肾上腺', '肾', '胰', '脾', '腹膜', '皮肤', '胸壁'];
    const hitOrg = organs.filter(o => new RegExp(`${o}.{0,6}${hasMetaWord.source}`).test(s));
    if (hitOrg.length) {
      if (multi.test(s) || hitOrg.length >= 2) return '1c';
      return '1b';
    }
    if (/(远处|远程).{0,8}(转移|阳性|存在|提示|考虑)/.test(s)) return '1b';
    return null;
  }

  if (type === 'esophageal') {
    if (includesAny(s, negative)) return '0';
    if (/(远处|远程).{0,8}(转移|阳性|存在|提示|考虑)/.test(s)) return '1';
    if (/(肝|肺|骨|脑|腹膜|肾上腺).{0,6}(转移|继发)/.test(s)) return '1';
    return null;
  }

  if (type === 'thymic') {
    if (includesAny(s, negative)) return '0';
    if (/(胸膜|心包).{0,8}(结节|转移|种植|播散)/.test(s)) return '1a';
    if (/(肺内|肺).{0,8}(转移|结节|种植|播散)/.test(s)) return '1b';
    if (/(肝|骨|脑|腹膜|肾上腺).{0,6}(转移|继发)/.test(s)) return '1b';
    if (/(远处|远程).{0,8}(转移|阳性|存在|提示|考虑)/.test(s)) return '1b';
    return null;
  }

  return null;
}

export function extractFromReportText(type: CancerType, text: string): ExtractResult {
  const raw = text || '';
  const normalized = raw.replace(/[，。；：]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return { error: '报告文本为空' };

  const extractedAnswers: Record<string, any> = {};
  const { t, n, m } = findTNM(normalized);
  const m2 = m ?? inferM(type, normalized);
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
    if (m2) {
      const map: Record<string, string> = {
        '0': 'M0: 无远处转移',
        '1a': 'M1a: 胸膜结节或恶性胸水',
        '1b': 'M1b: 单一肺外器官单病灶转移',
        '1c': 'M1c: 单一肺外多个转移或多器官转移',
        '1': 'M1b: 单一肺外器官单病灶转移',
      };
      extractedAnswers.m_status = map[m2.toLowerCase()];
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
    if (m2) extractedAnswers.m_status = m2 === '0' ? 'M0: 无远程转移' : 'M1: 有远处转移';
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
    if (m2) {
      const map: Record<string, string> = {
        '0': 'M0: 无',
        '1a': 'M1a: 胸膜或心包结节',
        '1b': 'M1b: 肺内或远程器官转移',
        '1': 'M1b: 肺内或远程器官转移',
      };
      extractedAnswers.m_status = map[m2.toLowerCase()];
    }
  }

  const keys = Object.keys(extractedAnswers);
  if (!keys.length) return { error: '未在文本中识别到 TNM 关键字（例如 T2N1M0 或 “肿瘤最大径 2.5cm”）' };

  const confidence = Math.min(0.95, Math.max(0.4, keys.length / 5));
  const reasoning = `从文本中识别到：${[t ? `T${t}` : null, n ? `N${n}` : null, m2 ? `M${m2}` : null, sizeCm ? `size≈${sizeCm.toFixed(2)}cm` : null].filter(Boolean).join('，')}`;
  return { extractedAnswers, reasoning, confidence };
}
