# MemoFlip × ChatGPT 匯入 Prompt

> 💡 使用方式：複製下方整個 Prompt 貼進 ChatGPT，把你的單字列表貼在最後，送出後把回傳的 JSON 貼進 App 的「ChatGPT 匯入」欄位。

---

## 📋 Prompt（可直接複製）

```
你是一位精通語言學、認知心理學與記憶法的語言學教授。
請把以下單字列表整理成 JSON 格式陣列，每個物件必須包含這些欄位：

- front: 原文（外語單字）
- back: 中文翻譯
- phonetic: 音標（IPA 格式，不確定可留空字串 ""）
- example_1: 一個簡單、生活化、高頻使用的例句（用 front 的語言）
- example_trans_1: 例句 1 的中文翻譯
- example_2: 一個稍微進階、帶有不同語意或慣用法、或不同時態的例句
- example_trans_2: 例句 2 的中文翻譯
- language: 語言代碼（荷蘭語=nl, 英文=en, 日文=ja, 德文=de, 法文=fr, 韓文=ko）
- tips: 教授級的記憶提示。請嚴格包含以下兩個部分，並使用指定的標籤開頭：
  【字源分析】：拆解字根、字首、字尾，解釋它的歷史或構詞邏輯。
  【生動聯想】：基於發音（諧音）或字形，利用大腦的「荒謬記憶效應（Bizarre Effect）」，創造一個極度生動、甚至有點荒謬的畫面或小故事情境，將外語發音與中文意思強烈連結起來。

tips 格式範例：
「【字源分析】：inspect = in（進入）+ spect（看）→ 探究內部。【生動聯想】：想像一個「鷹眼（in）」督察官，戴著放大鏡「死盯（spect）」著工廠裡每一個角落的瑕疵。」

回覆只要純 JSON 陣列，不要其他說明文字。

單字列表：
（← 在這裡貼上你的單字）
```

---

## ✅ 回傳格式範例

```json
[
  {
    "front": "inspecteren",
    "back": "檢查、視察",
    "phonetic": "/ɪnˈspɛktərən/",
    "example_1": "De dokter inspecteert de wond.",
    "example_trans_1": "醫生檢查傷口。",
    "example_2": "De politie zal de plaats delict grondig inspecteren.",
    "example_trans_2": "警方將徹底視察犯罪現場。",
    "language": "nl",
    "tips": "【字源分析】：inspect（看）+ eren（動詞後綴）→ 進行看的動作。【生動聯想】：想像一隻「鷹（in）」戴著「斯佩克特（spect）」黑框眼鏡，仔細飛進去「檢查」每一個角落。"
  }
]
```

---

## 📌 欄位說明

| 欄位 | 必填 | 說明 |
|------|------|------|
| `front` | ✅ | 要背的外語單字或片語 |
| `back` | ✅ | 中文翻譯 |
| `phonetic` | ⬜ | IPA 音標，不確定可填 `""` |
| `example_1` | ⬜ | 簡單生活化例句（用外語寫） |
| `example_trans_1` | ⬜ | 例句 1 中文翻譯 |
| `example_2` | ⬜ | 進階情境例句 |
| `example_trans_2` | ⬜ | 例句 2 中文翻譯 |
| `language` | ✅ | 語言代碼 |
| `tips` | ⬜ | 【字源分析】+【生動聯想】 |

---

_最後更新：2026-02-23_
