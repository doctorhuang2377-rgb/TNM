import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null | undefined;

const STORAGE_KEY = 'gemini_api_key';

export function getStoredGeminiApiKey() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredGeminiApiKey(apiKey: string) {
  const v = apiKey.trim();
  try {
    localStorage.setItem(STORAGE_KEY, v);
    ai = v ? new GoogleGenAI({ apiKey: v }) : null;
  } catch {
    throw new Error('无法保存 API Key（浏览器禁用了本地存储或处于隐私模式）');
  }
}

export function clearStoredGeminiApiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    ai = null;
  } catch {
    throw new Error('无法清除 API Key（浏览器禁用了本地存储或处于隐私模式）');
  }
}

export function hasGeminiApiKey() {
  return Boolean(getStoredGeminiApiKey() || import.meta.env.VITE_GEMINI_API_KEY);
}

function getAiClient() {
  if (ai !== undefined) return ai;
  const apiKey = getStoredGeminiApiKey() || import.meta.env.VITE_GEMINI_API_KEY;
  ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  return ai;
}

export async function analyzeStaging(type: 'lung' | 'esophageal' | 'thymic', data: any) {
  const client = getAiClient();
  if (!client) return "未配置 Gemini API Key，无法生成 AI 分期报告。请在页面内保存 Key 后再试。";
  const prompt = `你是一位胸外科专家。请根据以下患者录入的 TNM 临床参数，给出 ${type} 癌症的临床分期建议（基于最新 AJCC 第八版分期指南）。

患者 TNM 数据：
${JSON.stringify(data, null, 2)}

请提供：
1. 临床分期估算（如 Stage IA1, IIIA 等）。
2. TNM 各项指标的简要解读。
3. 根据 NCCN 或 CSCO 指南推荐的首选治疗方案（如：手术、辅助化疗、放疗、免疫治疗等）。
4. 预后参考建议。

请使用结构清晰、医学专业的中文回答。`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    return "抱歉，分析暂时不可用。请务必咨询专业医生。";
  }
}

export async function extractParamsFromReport(config: any, text?: string, images?: { data: string, mimeType: string }[]) {
  const client = getAiClient();
  if (!client) return null;
  const parts: any[] = [];
  
  const prompt = `你是一位极其专业的胸外专科医师。你的任务是从提供的报告中提取 TNM 分期参数。
  当前癌种：${config.title}
  
  必须从以下预设选项中为每个参数选择最匹配的一项：
  ${JSON.stringify(config.params, null, 2)}
  
  请返回 JSON 格式：
  {
    "extractedAnswers": {
      "参数ID": "所选选项文字",
      ...
    },
    "reasoning": "提取依据简述",
    "confidence": 0.9
  }
  
  注意：
  1. 必须严格使用我提供的“参数ID”作为键。
  2. 必须严格从我提供的 options 数组中选择文字。
  3. 如果是数字类型参数，直接提取数字。
  4. 只返回 JSON。`;

  parts.push({ text: prompt });
  if (text) parts.push({ text: `报告文本：\n${text}` });
  if (images) {
    images.forEach(img => {
      parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      });
    });
  }

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json" }
    });

    const raw = response.text || '';
    try {
      return JSON.parse(raw || '{}');
    } catch {
      return { error: '模型返回的不是合法 JSON', raw };
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    return { error: message };
  }
}
