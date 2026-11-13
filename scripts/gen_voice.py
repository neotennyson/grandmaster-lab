#!/usr/bin/env python3
"""Render Elias Thorne's review and training voice cues with Kokoro TTS.

Kokoro is Apache-2.0. The browser plays these local clips; no TTS service or
browser speech synthesis is used at runtime. Requires kokoro, numpy, and the
macOS afconvert utility.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
from kokoro import KPipeline

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "voice")
VOICE = "bm_george"
SAMPLE_RATE = 24000

CUES = {
    "review_entry": "Let's go through this game one move at a time.",
    "intro_hype": "Excellent play. Let's look for the small improvements.",
    "intro_praise": "A solid game. We'll find a couple of decisions and a stronger plan.",
    "intro_calm": "Honest numbers. This review is a chance to learn, not a verdict.",
    "walk_brilliant": "A brilliant move. See how it works with the position.",
    "walk_great": "A strong move. Look at the idea behind it.",
    "walk_best": "This was the best move. Here's why.",
    "walk_excellent": "Excellent. That keeps the advantage.",
    "walk_good": "A good move. A solid choice.",
    "walk_book": "Book move. The opening idea is working.",
    "walk_inaccuracy": "A small inaccuracy. Here's what changed.",
    "walk_mistake": "A mistake. Let's find the stronger plan.",
    "walk_blunder": "A blunder. We'll work out what it missed.",
    "opening_clean": "Clean run. You remembered the main ideas.",
    "opening_slip": "A few slips. Let's repeat the line and make it feel natural.",
    "master_intro": "Let's see how these players improved their pieces before they attacked.",
    "drill_intro": "Let's practice this line together. I'll explain the ideas as we go.",
    "drill_book:0": "Right. That's the main move here.",
    "drill_book:1": "Good. That keeps the line on track.",
    "drill_book:2": "Yes. Keep developing and maintain the pressure.",
    "drill_slip": "Not quite. Here's the move the line wants.",
    "puzzle_correct": "That's it. Now notice what the move threatens next.",
    "puzzle_wrong": "Not quite. Look for checks, captures, and threats before trying again.",
    "master_move:0": "What does this move improve?",
    "master_move:1": "Look at what changed.",
    "master_move:2": "Notice the two threats.",
    "master_move:3": "Here's the key idea.",
}


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for name in os.listdir(OUT):
        if name.endswith(".m4a"):
            os.remove(os.path.join(OUT, name))

    pipeline = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    cues = {}
    for key, text in CUES.items():
        fname = f"c_{key.replace(':', '_')}.m4a"
        synth(pipeline, text, fname)
        cues[key] = [f"/voice/{fname}"]

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump({"cues": cues}, f, indent=1)
    print(f"done: {len(CUES)} Kokoro voice cues ({VOICE})")


def synth(pipeline, text: str, fname: str) -> None:
    wav_path = fname.replace(".m4a", ".wav")
    audio = next(pipeline(text, voice=VOICE))[2]
    if hasattr(audio, "detach"):
        audio = audio.detach().cpu().numpy()
    audio = np.asarray(audio, dtype=np.float32)
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    wav_file = os.path.join(OUT, wav_path)
    m4a_file = os.path.join(OUT, fname)
    with wave.open(wav_file, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", wav_file, m4a_file], check=True)
    os.remove(wav_file)


if __name__ == "__main__":
    sys.exit(main())
