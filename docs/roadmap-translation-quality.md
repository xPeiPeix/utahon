# Roadmap: 翻译质量「信达雅」三阶段升级

> 当前问题：Gemini 生成的中文翻译在意境、文采上欠缺。根因是 prompt 缺上下文 + 模型层次低 + 单次调用既翻译又拆词、注意力被瓜分。

---

## 0. 现状盘点（2026-04 baseline）

| 项 | 当前实现 | 问题 |
|---|---|---|
| 翻译模型 | `gemini-2.5-flash-lite` | flash-lite 是最弱档，翻译"创作"任务吃亏 |
| 转录模型 | `gemini-3.1-flash-lite-preview` | 机械任务，flash-lite 够用，无需升级 |
| Prompt 上下文 | **完全没传歌名/歌手** | `analyze-pipeline.ts` 接到 title/artist 但调用 `analyzeLines(parsed)` 时没传过去 |
| 翻译指令 | 仅"自然流畅、不要直译" | 没有明确"歌词体"指引、没有意境/呼应/留白要求 |
| 调用结构 | 单次调用同时返 `translation + tokens` | 模型注意力被拆词分走，翻译质量被压制 |

---

## 1. Phase A · 零成本上下文注入（已实施）

**目标**：不增加 API 成本，把"被丢弃的歌曲元信息"和"歌词体翻译指引"塞进 prompt。

**改动范围**：
- `lib/gemini.ts`：扩展 `analyzeLines()` 签名接收 `{ title?, artist? }`，在 prompt 拼接「歌曲信息」段落；改写 `SYSTEM_PROMPT` 强化"信达雅"+歌词体翻译原则。
- `lib/analyze-pipeline.ts`：把已有的 `title/artist` 传给 `analyzeLines()`。

**预期收益**：
- Gemini 知道"这是哪首歌、谁唱的、是歌词"，避免按散文/对白翻译
- 同一意象/关键词在全曲保持一致译法（呼应感）
- 抒情句留白克制、叙事句平实自然

**验证方式**：选 2-3 首之前翻译"出戏"的歌（如有强意象的抒情曲）重转，对比新旧译文。

---

## 2. Phase B · 拆分翻译 / 拆词为两次调用

**目标**：让翻译那次调用心无旁骛当"诗人"，拆词那次专心当"语法老师"。

**改动设想**：
- 把 `analyzeLines()` 拆成两个内部函数：
  - `translateLines(lines, ctx)` → 只返回 `{ original, translation }[]`
  - `tokenizeLines(lines)` → 只返回 `{ tokens }[]`
- 两次调用并行（`Promise.all`），结果按行号合并
- 翻译那次的 prompt 可以更"放飞"，例如要求模型先输出全曲情感基调再逐句翻

**成本影响**：
- API 调用次数 ×2，但单次 prompt 更短（拆词不需要翻译规则、翻译不需要词性表）
- 总 token 量大致持平，延迟略增

**风险**：
- `lrclib.ts` / `transcribe.ts` 等上游不需要改，pipeline 兼容
- 失败重试逻辑需要分别处理两个调用的降级

**预期收益**：
- 翻译质量"再上一档"（实测过 GPT/Claude 类模型，分离任务后翻译流畅度提升明显）
- 拆词准确率小幅提升（不再被翻译干扰）

---

## 3. Phase C · 翻译步骤升级到 Gemini 3.1 Pro

**目标**：把"翻译"这一步换到 Gemini 顶级模型，质量满血。

**模型分工建议**：

| 步骤 | 模型 | 理由 |
|---|---|---|
| 转录 (`transcribe.ts`) | `gemini-3.1-flash-lite-preview` | 保持，音频→文本机械任务，flash-lite 够 |
| 拆词 (`tokenizeLines`) | `gemini-2.5-flash-lite` | 保持，词性标注规则明确 |
| 翻译 (`translateLines`) | **`gemini-3.1-pro`** | 升级！这步是用户体感核心 |

**Gemini 3.1 Pro 定价**（≤200K 上下文，2026-04 数据）：
- 输入 $2.00 / 1M tokens
- 输出 $12.00 / 1M tokens
- 上下文窗口 1.0M tokens

**单首歌成本估算**（60 行歌词为例）：
- 输入 ≈ 1.5K tokens（含 system prompt + 元信息 + 歌词）
- 输出 ≈ 2-3K tokens（仅翻译，不含 tokens）
- 单次成本 ≈ $0.003 + $0.036 ≈ **$0.04 / 首 ≈ ¥0.30 / 首**
- 月成本（10 首/天）≈ ¥90/月

**实施前提**：
- Phase B 必须先完成（翻译已独立成单次调用）
- 通过环境变量 `GEMINI_TRANSLATE_MODEL` 控制，默认值保持 flash-lite，主人手动切换到 pro

**风险**：
- Pro 模型 RPD 限额比 flash-lite 紧，批量 ingest 需要节流
- 失败降级链：3.1-pro → 2.5-pro → 2.5-flash-lite

---

## 4. Phase D · 增强上下文（可选，未排期）

**思路**：进一步把"歌曲背景"喂给翻译模型。

**可选数据源**：
- **网易云 UGC 翻译**：Phase A 既然已经接了网易云导入，导入时顺手抓 UGC 中文翻译，作为「参考译法」喂给 Gemini（不抄，仅参考）
- **官方歌词解析**：网易云/QQ 音乐的 "歌词解析" 字段（如有）
- **维基百科条目**：歌曲/专辑的创作背景、风格定位

**风险**：
- 数据获取脆弱（网易云接口变动频繁）
- prompt 长度可能膨胀，触发长上下文计费档（>200K）

**建议**：等 Phase A/B/C 落地后，根据实际翻译质量再评估是否需要。

---

## 5. 决策记录

| 日期 | 决策 | 来源 |
|---|---|---|
| 2026-04-24 | 采用 Phase A，立即实施零成本注入 | Peipei 主人 |
| 2026-04-24 | Phase B/C/D 写入规划，未排期 | Peipei 主人 |
