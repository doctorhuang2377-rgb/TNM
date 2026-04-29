type CancerType = 'lung' | 'esophageal' | 'thymic';

type StagingAnswers = Record<string, any>;

type StageResult = {
  stage: string;
  tnm: { T?: string; N?: string; M?: string };
  notes: string[];
  interpretation: string[];
  treatment: string[];
  prognosis: string[];
};

function pickPrefix(value: unknown, prefixes: string[]) {
  if (typeof value !== 'string') return null;
  const toHalfWidth = (input: string) =>
    input
      .replace(/\u3000/g, ' ')
      .replace(/[\uff01-\uff5e]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

  const s = toHalfWidth(value).trim().toUpperCase();
  for (const p of prefixes) {
    const pp = toHalfWidth(p).trim().toUpperCase();
    if (s.startsWith(pp)) return p;
  }
  return null;
}

function parseNumber(v: unknown) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type TOrderKey =
  | 'Tis'
  | 'T1a'
  | 'T1b'
  | 'T1c'
  | 'T2a'
  | 'T2b'
  | 'T3'
  | 'T4';

const tOrder: Record<TOrderKey, number> = {
  Tis: 0,
  T1a: 1,
  T1b: 2,
  T1c: 3,
  T2a: 4,
  T2b: 5,
  T3: 6,
  T4: 7,
};

function maxT(a: TOrderKey, b: TOrderKey): TOrderKey {
  return tOrder[a] >= tOrder[b] ? a : b;
}

function lungTFromSize(sizeCm: number | null): TOrderKey | null {
  if (!sizeCm || sizeCm <= 0) return null;
  if (sizeCm <= 1) return 'T1a';
  if (sizeCm <= 2) return 'T1b';
  if (sizeCm <= 3) return 'T1c';
  if (sizeCm <= 4) return 'T2a';
  if (sizeCm <= 5) return 'T2b';
  if (sizeCm <= 7) return 'T3';
  return 'T4';
}

function lungT(answers: StagingAnswers) {
  const size = parseNumber(answers.t_size);
  const invasion = typeof answers.t_invasion === 'string' ? answers.t_invasion : '';
  const bySize = lungTFromSize(size);
  if (invasion === '侵犯纵隔器官(心/大血管/食管)' || invasion === '同侧不同肺叶结节') {
    return { T: 'T4', notes: [] as string[], size };
  }
  if (invasion === '局限于肺泡内') {
    const notes: string[] = [];
    if (size && size > 3) notes.push('“局限于肺泡内”通常应满足肿瘤≤3cm；当前录入大小提示可能需要复核。');
    return { T: 'Tis', notes, size };
  }
  let tKey = bySize ?? 'T1a';
  if (invasion === '侵犯脏层胸膜' || invasion === '侵犯主支气管') {
    tKey = maxT(tKey, 'T2a');
  }
  return { T: tKey, notes: [] as string[], size };
}

function lungStage(T: string | undefined, N: string | undefined, M: string | undefined): string {
  if (!T || !N || !M) return '无法分期（信息不全）';
  if (M === 'M1c') return 'IVB';
  if (M === 'M1a' || M === 'M1b') return 'IVA';
  if (M !== 'M0') return 'IV';

  if (T === 'Tis' && N === 'N0') return '0';

  const isT12 = ['T1a', 'T1b', 'T1c', 'T2a', 'T2b'].includes(T);

  if (N === 'N0') {
    if (T === 'T1a') return 'IA1';
    if (T === 'T1b') return 'IA2';
    if (T === 'T1c') return 'IA3';
    if (T === 'T2a') return 'IB';
    if (T === 'T2b') return 'IIA';
    if (T === 'T3') return 'IIB';
    if (T === 'T4') return 'IIIA';
  }

  if (N === 'N1') {
    if (isT12) return 'IIB';
    if (T === 'T3') return 'IIIA';
    if (T === 'T4') return 'IIIA';
  }

  if (N === 'N2') {
    if (isT12) return 'IIIA';
    if (T === 'T3' || T === 'T4') return 'IIIB';
  }

  if (N === 'N3') {
    if (isT12) return 'IIIB';
    if (T === 'T3' || T === 'T4') return 'IIIC';
  }

  return 'III（需进一步核对 TNM）';
}

function esophagealTNM(answers: StagingAnswers) {
  const t = typeof answers.t_invasion === 'string' ? answers.t_invasion : '';
  const n = typeof answers.n_count === 'string' ? answers.n_count : '';
  const m = typeof answers.m_status === 'string' ? answers.m_status : '';
  const T =
    t.includes('(T1)') ? 'T1' :
    t.includes('(T2)') ? 'T2' :
    t.includes('(T3)') ? 'T3' :
    t.includes('(T4a)') ? 'T4a' :
    t.includes('(T4b)') ? 'T4b' :
    undefined;
  const N = pickPrefix(n, ['N0', 'N1', 'N2', 'N3']) ?? undefined;
  const M = pickPrefix(m, ['M0', 'M1']) ?? undefined;
  return { T, N, M };
}

function esophagealStage(T: string | undefined, N: string | undefined, M: string | undefined) {
  if (!T || !N || !M) return '无法分期（信息不全）';
  if (M === 'M1') return 'IVB';
  if (T === 'T4b' || N === 'N3') return 'IVA';
  if (T === 'T4a') return 'III';
  if (T === 'T3') return N === 'N0' ? 'II' : 'III';
  if (T === 'T2') return N === 'N0' ? 'II' : 'III';
  if (T === 'T1') {
    if (N === 'N0') return 'I';
    if (N === 'N1') return 'II';
    return 'III';
  }
  return 'III';
}

function thymicTNM(answers: StagingAnswers) {
  const t = typeof answers.t_invasion === 'string' ? answers.t_invasion : '';
  const n = typeof answers.n_status === 'string' ? answers.n_status : '';
  const m = typeof answers.m_status === 'string' ? answers.m_status : '';
  const T = pickPrefix(t, ['T1', 'T2', 'T3', 'T4']) ?? undefined;
  const N = pickPrefix(n, ['N0', 'N1', 'N2']) ?? undefined;
  const M = pickPrefix(m, ['M0', 'M1a', 'M1b']) ?? undefined;
  return { T, N, M };
}

function thymicStage(T: string | undefined, N: string | undefined, M: string | undefined) {
  if (!T || !N || !M) return '无法分期（信息不全）';
  if (M === 'M1b') return 'IVB';
  if (M === 'M1a') return 'IVA';
  if (N === 'N2') return 'IVB';
  if (N === 'N1') return 'IVA';
  if (T === 'T1') return 'I';
  if (T === 'T2') return 'II';
  if (T === 'T3') return 'IIIA';
  if (T === 'T4') return 'IIIB';
  return 'III';
}

type StageGroup = '0' | 'I' | 'II' | 'III' | 'IV' | null;

function getStageGroup(stage: string): StageGroup {
  const s = stage.trim().toUpperCase();
  if (s === '0') return '0';
  if (s.startsWith('IV')) return 'IV';
  if (s.startsWith('III')) return 'III';
  if (s.startsWith('II')) return 'II';
  if (s.startsWith('I')) return 'I';
  return null;
}

function stageToTreatment(type: CancerType, stage: string) {
  const group = getStageGroup(stage);
  const lines: string[] = [];
  if (type === 'lung') {
    if (group === '0' || group === 'I' || group === 'II') {
      lines.push('优先评估可切除性：以根治性手术为主，结合病理/分子分型决定是否辅助治疗。');
      lines.push('术前分期完善：增强胸部CT/或PET-CT、脑MRI（按风险）、纵隔淋巴结评估。');
      if (group === 'II') lines.push('多学科评估：术后辅助化疗/放疗/靶向/免疫根据风险与指南选择。');
      return lines;
    }
    if (group === 'III') {
      lines.push('多学科综合治疗为主：同步/序贯放化疗±免疫巩固，或新辅助后手术（严格筛选）。');
      lines.push('建议完善纵隔分期（EBUS/纵隔镜）与远处转移筛查。');
      return lines;
    }
    if (group === 'IV') {
      lines.push('全身治疗为主：根据驱动基因/PD-L1选择靶向、免疫联合化疗等。');
      lines.push('少数寡转移可考虑局部治疗（放疗/消融/手术）联合系统治疗（需MDT）。');
      return lines;
    }
  }

  if (type === 'esophageal') {
    if (group === 'I') {
      lines.push('早期可考虑内镜治疗或手术（需结合病理分化、浸润深度、淋巴结风险）。');
      lines.push('建议完善EUS/增强CT/PET-CT（按条件）评估分期。');
      return lines;
    }
    if (group === 'II' || group === 'III') {
      lines.push('以新辅助放化疗/化疗后手术为常见策略（需MDT与体能评估）。');
      lines.push('术后根据病理分期与疗效决定辅助治疗/随访计划。');
      return lines;
    }
    if (group === 'IV') {
      lines.push('以系统治疗与姑息/转化治疗为主：化疗±免疫/靶向（按分子标志物）。');
      lines.push('吞咽困难可考虑支架/放疗/营养支持。');
      return lines;
    }
  }

  if (type === 'thymic') {
    if (group === 'I' || group === 'II') {
      lines.push('以完整切除手术为主，术后是否放疗取决于分期、切缘、病理类型与复发风险。');
      return lines;
    }
    if (group === 'III') {
      lines.push('以MDT为核心：新辅助/辅助治疗（放疗/化疗）联合手术（可切除者）或根治放化疗。');
      return lines;
    }
    if (group === 'IV') {
      lines.push('以系统治疗为主：化疗±放疗/局部治疗（按病灶分布与症状）。');
      lines.push('胸膜/心包播散可考虑减瘤手术+局部/系统治疗（需严格筛选）。');
      return lines;
    }
  }
  return ['建议由胸外科/肿瘤科MDT结合影像、病理与分子结果制定治疗方案。'];
}

function stageToPrognosis(stage: string) {
  const group = getStageGroup(stage);
  if (group === '0' || group === 'I') return ['总体预后相对较好，关键在于早期根治与规范随访。'];
  if (group === 'II') return ['预后中等，取决于切除完整性、淋巴结状态与辅助治疗依从性。'];
  if (group === 'III') return ['预后相对较差，治疗通常需要多学科综合方案，疗效差异较大。'];
  if (group === 'IV') return ['预后通常较差，以延长生存与改善生活质量为目标，疗效与分子分型、治疗反应密切相关。'];
  return ['需结合个体情况综合评估预后。'];
}

export function runStagingAgent(type: CancerType, answers: StagingAnswers): StageResult {
  const notes: string[] = [];
  let tnm: { T?: string; N?: string; M?: string } = {};
  let stage = '无法分期（信息不全）';

  if (type === 'lung') {
    const { T, notes: tNotes, size } = lungT(answers);
    notes.push(...tNotes);
    const N = pickPrefix(answers.n_status, ['N0', 'N1', 'N2', 'N3']) ?? undefined;
    const M = pickPrefix(answers.m_status, ['M0', 'M1a', 'M1b', 'M1c']) ?? undefined;
    tnm = { T, N, M };
    stage = lungStage(T, N, M);
    if (!size) notes.push('未录入原发肿瘤大小，T 分期按侵犯范围/最小值估计，建议补全。');
    if (!M) notes.push('未识别到 M 分期（远处转移）。请在表单中选择 M0/M1a/M1b/M1c，或在报告文本里包含 M0/M1a/M1b/M1c 等字样。');
    if (!N) notes.push('未识别到 N 分期（淋巴结）。请在表单中选择 N0-N3，或在报告文本里包含 N0-N3 等字样。');
  }

  if (type === 'esophageal') {
    tnm = esophagealTNM(answers);
    stage = esophagealStage(tnm.T, tnm.N, tnm.M);
    notes.push('食管癌 AJCC8 分期受分化程度、肿瘤部位等影响较大；此处为基于 TNM 的简化分组，需结合病理与MDT复核。');
    if (!tnm.M) notes.push('未识别到 M 分期（远处转移）。请在表单中选择 M0/M1，或在报告文本里包含 M0/M1。');
  }

  if (type === 'thymic') {
    tnm = thymicTNM(answers);
    stage = thymicStage(tnm.T, tnm.N, tnm.M);
    if (!tnm.M) notes.push('未识别到 M 分期（远处转移）。请在表单中选择 M0/M1a/M1b，或在报告文本里包含 M0/M1a/M1b。');
  }

  const interpretation: string[] = [];
  if (tnm.T) interpretation.push(`T：${tnm.T}`);
  if (tnm.N) interpretation.push(`N：${tnm.N}`);
  if (tnm.M) interpretation.push(`M：${tnm.M}`);
  if (!interpretation.length) interpretation.push('未能识别到完整 TNM 参数。');

  const treatment = stageToTreatment(type, stage);
  const prognosis = stageToPrognosis(stage);

  return { stage, tnm, notes, interpretation, treatment, prognosis };
}

export function formatStagingReport(type: CancerType, r: StageResult) {
  const title =
    type === 'lung' ? '肺癌（NSCLC）临床分期建议' :
    type === 'esophageal' ? '食管癌临床分期建议' :
    '胸腺肿瘤分期建议';

  const lines: string[] = [];
  lines.push(`${title}`);
  lines.push('');
  lines.push(`1. 临床分期估算：Stage ${r.stage}`);
  lines.push('');
  lines.push('2. TNM 解读：');
  for (const s of r.interpretation) lines.push(`- ${s}`);
  if (r.notes.length) {
    lines.push('');
    lines.push('补充提示：');
    for (const n of r.notes) lines.push(`- ${n}`);
  }
  lines.push('');
  lines.push('3. 治疗方案（概览，需MDT结合指南）：');
  for (const t of r.treatment) lines.push(`- ${t}`);
  lines.push('');
  lines.push('4. 预后参考：');
  for (const p of r.prognosis) lines.push(`- ${p}`);
  lines.push('');
  lines.push('免责声明：本系统仅提供科研参考与风险评估建议，不能替代正式医疗诊断与治疗决策。');
  return lines.join('\n');
}
