import { StagingConfig } from "./types";

export const STAGING_CONFIG: StagingConfig[] = [
  {
    id: 'lung',
    title: '肺癌 TNM 分期',
    description: '非小细胞肺癌 (NSCLC) AJCC 第八版临床分期。',
    params: {
      T: [
        { id: 't_size', text: '原发肿瘤最大径 (cm)', type: 'number', placeholder: '如 2.5', category: 'T' },
        { id: 't_invasion', text: '侵犯范围', type: 'select', options: ['局限于肺泡内', '侵犯脏层胸膜', '侵犯主支气管', '侵犯纵隔器官(心/大血管/食管)', '同侧不同肺叶结节'], category: 'T' }
      ],
      N: [
        { id: 'n_status', text: '淋巴结转移情况', type: 'select', options: ['N0: 无淋巴结转移', 'N1: 同侧支气管或肺门淋巴结', 'N2: 同侧纵隔或隆突下淋巴结', 'N3: 对侧纵隔、对侧肺门或锁骨上淋巴结'], category: 'N' }
      ],
      M: [
        { id: 'm_status', text: '远处转移', type: 'select', options: ['M0: 无远处转移', 'M1a: 胸膜结节或恶性胸水', 'M1b: 单一肺外器官单病灶转移', 'M1c: 单一肺外多个转移或多器官转移'], category: 'M' }
      ]
    }
  },
  {
    id: 'esophageal',
    title: '食管癌 TNM 分期',
    description: '食管癌 AJCC 第八版临床/病理分期。',
    params: {
      T: [
        { id: 't_invasion', text: '侵犯深度', type: 'select', options: ['黏膜层 (T1)', '肌层 (T2)', '纤维外膜 (T3)', '邻近结构-可切除(T4a)', '邻近结构-不可切除(T4b)'], category: 'T' }
      ],
      N: [
        { id: 'n_count', text: '区域淋巴结转移个数', type: 'select', options: ['N0: 0个', 'N1: 1-2个', 'N2: 3-6个', 'N3: >=7个'], category: 'N' }
      ],
      M: [
        { id: 'm_status', text: '远处转移', type: 'select', options: ['M0: 无远程转移', 'M1: 有远处转移'], category: 'M' }
      ]
    }
  },
  {
    id: 'thymic',
    title: '胸腺肿瘤 TNM 分期',
    description: '适用于胸腺癌及胸腺瘤。',
    params: {
      T: [
        { id: 't_invasion', text: '心脏/纵隔侵犯情况', type: 'select', options: ['T1: 局限于胸腺', 'T2: 侵犯心包', 'T3: 侵犯肺/无名静脉/膈神经等', 'T4: 侵犯心脏/大血管'], category: 'T' }
      ],
      N: [
        { id: 'n_status', text: '淋巴结情况', type: 'select', options: ['N0: 无', 'N1: 前/纵隔淋巴结', 'N2: 深部纵隔或锁骨上'], category: 'N' }
      ],
      M: [
        { id: 'm_status', text: '远程转移', type: 'select', options: ['M0: 无', 'M1a: 胸膜或心包结节', 'M1b: 肺内或远程器官转移'], category: 'M' }
      ]
    }
  }
];
