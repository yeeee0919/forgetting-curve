#!/usr/bin/env python3
"""
使用 Microsoft Edge TTS 批量生成荷蘭語音檔
Voice: nl-NL-ColetteNeural（荷蘭女聲，高品質）
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import edge_tts

VOICE      = "nl-NL-ColetteNeural"
SCRIPT_DIR = Path(__file__).parent
PHRASES    = SCRIPT_DIR / "phrases.json"
OUTPUT_DIR = SCRIPT_DIR.parent / "public" / "audio"

async def generate_one(hash_val: str, text: str, idx: int, total: int) -> bool:
    out_path = OUTPUT_DIR / f"{hash_val}.mp3"
    if out_path.exists():
        print(f"[{idx}/{total}] ⏭  skip (cached): {text[:50]}")
        return True
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(str(out_path))
        print(f"[{idx}/{total}] ✅ {text[:60]}")
        return True
    except Exception as e:
        print(f"[{idx}/{total}] ❌ failed: {e} | text: {text[:50]}", file=sys.stderr)
        return False

async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(PHRASES, "r", encoding="utf-8") as f:
        phrases = json.load(f)

    total = len(phrases)
    print(f"🎙️  開始生成 {total} 個荷蘭語音檔 (voice: {VOICE})\n")

    # 並發處理，每批 10 個
    batch_size = 10
    ok = 0
    for i in range(0, total, batch_size):
        batch = phrases[i : i + batch_size]
        tasks = [
            generate_one(p["hash"], p["text"], i + j + 1, total)
            for j, p in enumerate(batch)
        ]
        results = await asyncio.gather(*tasks)
        ok += sum(results)
        await asyncio.sleep(0.2)  # 避免觸發速率限制

    print(f"\n✅ 完成！成功 {ok}/{total} 個音檔，儲存於 {OUTPUT_DIR}")

if __name__ == "__main__":
    asyncio.run(main())
