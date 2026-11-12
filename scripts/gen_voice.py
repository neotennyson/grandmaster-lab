#!/usr/bin/env python3
"""Pre-render Elias Thorne's voice lines with Kokoro TTS (Apache-2.0).

Outputs public/voice/*.m4a + public/voice/manifest.json.
Exact lines MUST stay in sync with src/lib/coach.ts rendered strings.
"""
import json
import os
import re
import subprocess
import sys
import wave

import numpy as np
from kokoro import KPipeline

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "voice")
VOICE = "bm_fable"
SAMPLE_RATE = 24000

EXACT = [
    # coachGreet
    "I am Elias Thorne. Every opening book, every immortal game, every engine line — all in here. You bring the hands.",
    "Elias Thorne here. The strongest player in existence is about to sit across from you. I'll make sure you survive, then thrive.",
    "Welcome back. The machine waits. Let's sharpen something today.",
    # coachStart
    "1-minute mode vs a perfect engine? We're gaming tonight. Premove everything — the clock is your real enemy.",
    "Claim the center, castle early, don't move a piece twice without cause — the gospel. Play.",
    "New war. I've eaten every opening book ever printed; you have one job — surprise yourself.",
    # NEUTRAL
    "Playable. But the sharper move existed — file it for the report.",
    "Okay. Not what I'd have chosen, but nothing breaks.",
    # CAPTURES
    "Material is just a bookkeeping detail — Tal would trade anything for this initiative. Snap it with purpose.",
    "Take it. Every capture is a promise you intend to keep.",
    # CHECKS
    "Check — the tap on the shoulder. Make sure you're not just knocking politely.",
    "Checking is asking a question. Fischer never asked unless the answer ended the story.",
    # TIME_PRESSURE
    "Twenty seconds. Breathe at the next move, not before.",
    "Now it's a fight against the clock too — flag-vs-blunder, choose your poison fast.",
    # YOUR_TURN_HYPE
    "Take your time. The engine isn't rushing; neither should you.",
    "Find the move that makes the engine pause one extra millisecond.",
    # zen
    "Chess is 99% technique, 1% imagination — but the 1% votes first.",
    "The master lost a thousand games before he found his footwork. You're in good company.",
    "When in doubt: improve your worst piece. When certain: be twice as certain.",
    "Tactics flow from a superior position. Make the ground fertile, then harvest.",
    "A blunder is data wearing a costume. Undress it in the report and it becomes strength.",
    # end
    "Even swords. Walking away whole from a perfect engine is a badge of a different shape.",
    "YOU beat the strongest engine alive. Whatever nerves you had before this session — delete them. This goes in the vault.",
    # bot reactions
    "He took something? Recalculate — safety or payback, pick a lane.",
    "You're checked. King first, counter later.",
]

CUES = {
    "praise_high:0": "That's chess from the atlas. Another one in flow — I can't improve on that, and I don't try.",
    "praise_high:1": "Engine-grade. The streak builds. Keep the pressure like this and the machine starts doubting itself.",
    "praise_high:2": "Best move on the board. This is the version of you I'm building.",
    "praise:0": "Clean. Very clean.",
    "praise:1": "Solid linework. Clean cuts, one after another.",
    "warn:0": "Loose. The sharper move would have gripped harder.",
    "warn:1": "You slipped some pressure — the report will have opinions about that.",
    "fire:0": "No. That was the move, and it isn't there now. Park it — the report will turn it into a lesson.",
    "fire:1": "That leaks blood. We will autopsy it after the game.",
    "warn_streak": "The streak ends there. The stronger move kept it tighter. Small cost, file it.",
    "fire_blunder": "Blunder. That was the spine of the position. Hold steady — the report will make this a weapon.",
    "end_calm:0": "You played brilliantly and still fell. That's the machine being the machine. We expand from here.",
    "end_calm:1": "Honest numbers, real combat. The report is your gym. Study one blunder only, and force out what it punished.",
    "end_calm:2": "Intense defeat — rich study material. Open the review. We fix two things today, not twenty.",
    "intro_hype": "Clinical. Let's find the last ten percent.",
    "intro_praise": "A fighter's game. We fix the leaks and you're crossing the next bar.",
    "intro_calm": "Honest numbers. This report is where you grow fastest.",
    "opening_clean": "Clean. That line now lives in you — opponents will donate pieces to it.",
    "opening_slip": "With slips. Run it again without my arrows. Mastery is playing blind and still being right.",
    "master_intro": "On this board, every move is a philosophy. Watch where the pieces are sent, not just where they go.",
    "levelup": "Level up. The student grows.",
    "drill_intro": "Follow the arrows and play the book moves. I'll call every one.",
    "drill_book:0": "Book move. The theory approves.",
    "drill_book:1": "Exactly what the line wants. Keep the rhythm.",
    "drill_book:2": "Book move. The line is taking shape on the board.",
    "drill_slip": "Off book. Here's what the line plays instead.",
    "master_move:0": "Watch this one closely.",
    "master_move:1": "Notice the plan.",
    "master_move:2": "This is where the game turns.",
    "master_move:3": "A move worth memorising.",
    "walk_brilliant": "A brilliant move. Here's why it works.",
    "walk_great": "A great move. Only one like it on the board.",
    "walk_best": "The engine's choice. Let's see the idea.",
    "walk_excellent": "Excellent. Nearly perfect.",
    "walk_good": "A good move. Solid, if not sharp.",
    "walk_book": "Book theory. The masters approve.",
    "walk_inaccuracy": "An inaccuracy. The position loosened a little.",
    "walk_mistake": "A mistake. This changed the evaluation.",
    "walk_blunder": "A blunder. Watch what it opens up.",
}


def norm(text: str) -> str:
    t = text.replace("•", " ").lower()
    t = re.sub(r"[^\w\s.,!?'’\-:;()%+]", " ", t, flags=re.UNICODE)
    return re.sub(r"\s+", " ", t).strip()


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    pipeline = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")

    exact_map = {}
    for i, text in enumerate(EXACT):
        fname = f"x{i:02d}.m4a"
        synth(pipeline, text, fname)
        exact_map.setdefault(norm(text), []).append(f"/voice/{fname}")

    cue_map = {}
    for key, text in CUES.items():
        fname = f"c_{key.replace(':', '_')}.m4a"
        synth(pipeline, text, fname)
        cue_map.setdefault(key, []).append(f"/voice/{fname}")

    manifest = {"exact": exact_map, "cues": cue_map}
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"done: {len(EXACT)} exact + {len(CUES)} cues")


def synth(pipeline, text: str, fname: str) -> None:
    wav_path = fname.replace(".m4a", ".wav")
    audio = next(pipeline(text, voice=VOICE))[2]
    if hasattr(audio, "detach"):
        audio = audio.detach().cpu().numpy()
    audio = np.asarray(audio, dtype=np.float32)
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, wav_path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())
    subprocess.run(
        ["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", os.path.join(OUT, wav_path), os.path.join(OUT, fname)],
        check=True,
    )
    os.remove(os.path.join(OUT, wav_path))


if __name__ == "__main__":
    sys.exit(main())
