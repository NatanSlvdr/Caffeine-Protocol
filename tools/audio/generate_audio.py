"""Render the original café loop and soft UI motifs using additive synthesis.
Run from the repository root; no external samples or dependencies are used.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parents[2] / 'assets' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)


def tone(samples, start, duration, midi, gain=0.1, bass=False):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    length = int(duration * RATE)
    origin = int(start * RATE)
    for i in range(length):
        t = i / RATE
        envelope = min(1.0, t / 0.015) * math.exp(-t * (3.0 if bass else 2.6))
        envelope *= min(1.0, (duration - t) / 0.05)
        phase = 2 * math.pi * frequency * t
        value = math.sin(phase) + 0.2 * math.sin(phase * 2) + 0.06 * math.sin(phase * 3)
        samples[(origin + i) % len(samples)] += value * gain * envelope


def save(name, samples):
    peak = max(abs(x) for x in samples) or 1
    factor = min(1, 0.85 / peak)
    payload = b''.join(struct.pack('<h', round(max(-1, min(1, x * factor)) * 32767)) for x in samples)
    with wave.open(str(OUT / name), 'wb') as file:
        file.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        file.writeframes(payload)


beat = 60 / 82
music = [0.0] * int(beat * 32 * RATE)
chords = [(60, 64, 67, 71), (57, 60, 64, 67), (53, 57, 60, 64), (55, 59, 62, 69)]
melodies = [(76, 74, 71, 67), (72, 71, 69, 67), (69, 72, 76, 74), (74, 71, 69, 67)]
random.seed(42)
for bar in range(8):
    chord = chords[bar % 4]
    for pulse in (0, 2.5):
        for voice, note in enumerate(chord):
            tone(music, (bar * 4 + pulse) * beat + voice * 0.014, beat * 2.2, note, 0.046)
    for pulse in (0, 2):
        tone(music, (bar * 4 + pulse) * beat, beat * 1.5, chord[0] - 24, 0.10, True)
    for position, note in zip((0.5, 1.75, 2.5, 3.5), melodies[bar % 4]):
        tone(music, (bar * 4 + position) * beat, beat * 0.85, note + (12 if bar >= 4 else 0), 0.033)
    for pulse in (1, 3):
        origin = int((bar * 4 + pulse) * beat * RATE)
        for i in range(int(RATE * 0.08)):
            music[(origin + i) % len(music)] += random.uniform(-1, 1) * 0.012 * math.exp(-i / RATE * 55)
save('morning_loop.wav', music)
for name, notes, spacing, gain in [('serve.wav', [79, 83], 0.10, 0.15), ('success.wav', [72, 76, 79, 84], 0.11, 0.15), ('retry.wav', [69, 65], 0.13, 0.10), ('click.wav', [84], 0.05, 0.06), ('pour.wav', [76, 74, 72], 0.09, 0.12)]:
    samples = [0.0] * int(RATE * (spacing * len(notes) + 0.3))
    for index, note in enumerate(notes):
        tone(samples, spacing * index, 0.28, note, gain)
    save(name, samples)
print('Rendered original café music and five sound motifs.')
