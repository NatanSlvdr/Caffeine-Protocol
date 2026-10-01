"""Render the café soundtrack by synthesis.

Run from the repository root (`npm run gen:audio`); standard library only, no
samples, so the music is original and free of third-party licences.

- `cafe_loop.wav`: a slow lo-fi jazz loop (72 BPM, 16 bars, Dm9 G13 Cmaj9 A7):
  electric-piano chords, round bass, brushed drums, a sparse vibraphone line
  and a little vinyl crackle, all rolled off for warmth. Tails wrap around so
  the loop is seamless.

The music is the game's only sound: no room tone, no UI or service effects.

The level is deliberately low; the runtime fades the music in after a pause.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
TAU = 2 * math.pi
OUT = Path(__file__).resolve().parents[2] / 'assets' / 'audio'
OUT.mkdir(parents=True, exist_ok=True)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def lowpass(samples, cutoff, passes=1, wrap=True):
    """One-pole low-pass, warmed up over the buffer so a looped track has no seam."""
    a = 1 - math.exp(-TAU * cutoff / RATE)
    for _ in range(passes):
        y = 0.0
        if wrap:
            for x in samples:
                y += a * (x - y)
        for i, x in enumerate(samples):
            y += a * (x - y)
            samples[i] = y
    return samples


def highpass(samples, cutoff, wrap=False):
    low = lowpass(list(samples), cutoff, wrap=wrap)
    return [x - l for x, l in zip(samples, low)]


def add(target, start, values, gain=1.0):
    """Mix values into target at a time offset, wrapping around the end."""
    origin = int(start * RATE)
    n = len(target)
    for i, v in enumerate(values):
        target[(origin + i) % n] += v * gain


def save(name, samples, peak):
    """Normalize to a soft peak and write 16-bit mono."""
    top = max(abs(x) for x in samples) or 1
    factor = peak / top
    payload = b''.join(struct.pack('<h', round(max(-1, min(1, x * factor)) * 32767)) for x in samples)
    with wave.open(str(OUT / name), 'wb') as file:
        file.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        file.writeframes(payload)


# --- Instruments -----------------------------------------------------------


def epiano(midi, duration, velocity=1.0):
    """Rhodes-like tine: a little FM on the attack that mellows into a sine."""
    f = hz(midi)
    out = []
    for i in range(int(duration * RATE)):
        t = i / RATE
        env = min(1.0, t / 0.006) * math.exp(-t * 1.6) * min(1.0, (duration - t) / 0.08)
        bright = 0.9 * math.exp(-t * 7)
        p = TAU * f * t
        out.append((math.sin(p + bright * math.sin(p)) + 0.08 * math.sin(2 * p)) * env * velocity)
    return out


def bass(midi, duration, velocity=1.0):
    f = hz(midi)
    out = []
    for i in range(int(duration * RATE)):
        t = i / RATE
        env = min(1.0, t / 0.012) * math.exp(-t * 2.2) * min(1.0, (duration - t) / 0.06)
        p = TAU * f * t
        out.append((math.sin(p) + 0.25 * math.sin(2 * p) * math.exp(-t * 4)) * env * velocity)
    return out


def vibes(midi, duration, velocity=1.0):
    """Soft vibraphone: sine plus a faint fourth partial and a slow tremolo."""
    f = hz(midi)
    out = []
    for i in range(int(duration * RATE)):
        t = i / RATE
        env = min(1.0, t / 0.004) * math.exp(-t * 1.9) * min(1.0, (duration - t) / 0.1)
        trem = 1 - 0.18 * (0.5 + 0.5 * math.sin(TAU * 4.6 * t))
        p = TAU * f * t
        out.append((math.sin(p) + 0.06 * math.sin(4 * p) * math.exp(-t * 9)) * env * trem * velocity)
    return out


def kick(velocity=1.0):
    out, phase = [], 0.0
    for i in range(int(0.32 * RATE)):
        t = i / RATE
        phase += TAU * (48 + 52 * math.exp(-t * 28)) / RATE
        out.append(math.sin(phase) * math.exp(-t * 11) * min(1.0, t / 0.002) * velocity)
    return out


def noise_burst(rng, duration, decay, cutoff, velocity=1.0, attack=0.002):
    raw = [rng.uniform(-1, 1) for _ in range(int(duration * RATE))]
    shaped = lowpass(raw, cutoff, passes=2, wrap=False)
    return [
        x * math.exp(-(i / RATE) * decay) * min(1.0, (i / RATE) / attack) * velocity
        for i, x in enumerate(shaped)
    ]


# --- Music -----------------------------------------------------------------

BPM = 72
BEAT = 60 / BPM
BARS = 16
SWING = 0.08  # offbeat eighths land a little late


def at(bar, beat):
    return (bar * 4 + beat) * BEAT


CHORDS = [  # (bass root, rootless voicing)
    (38, (53, 57, 60, 64)),  # Dm9
    (43, (53, 59, 64, 69)),  # G13
    (36, (52, 59, 62, 67)),  # Cmaj9
    (45, (55, 61, 65, 71)),  # A7(9, b13)
]

# Sparse vibraphone phrases: (bar, beat, midi, beats held). Bars 0-3 and 8-11 stay bare.
MELODY = [
    (4, 0.5, 69, 1.0), (4, 1.5, 72, 1.0), (4, 2.5, 76, 2.5),
    (5, 1.0, 74, 1.0), (5, 2.0, 71, 2.0),
    (6, 0.5, 67, 1.0), (6, 1.5, 71, 1.0), (6, 2.5, 74, 3.0),
    (7, 1.0, 73, 1.0), (7, 2.0, 69, 2.0),
    (12, 0.0, 76, 1.5), (12, 1.5, 74, 0.5), (12, 2.0, 72, 2.0),
    (13, 0.5, 71, 1.0), (13, 1.5, 69, 1.0), (13, 2.5, 67, 1.5),
    (14, 0.5, 64, 1.0), (14, 1.5, 67, 1.0), (14, 2.5, 71, 1.0), (14, 3.5, 74, 2.0),
    (15, 1.0, 73, 1.5), (15, 2.5, 69, 3.0),
]


def render_music():
    rng = random.Random(7)
    keys = [0.0] * int(at(BARS, 0) * RATE)
    low = [0.0] * len(keys)
    drums = [0.0] * len(keys)
    lead = [0.0] * len(keys)

    for bar in range(BARS):
        root, voicing = CHORDS[bar % 4]
        # Chords: a long pad on the downbeat, a lighter push on the "and" of 2.
        for beat, length, vel in ((0.0, 2.6, 1.0), (1.5 + SWING, 1.4, 0.55)):
            for voice, note in enumerate(voicing):
                add(keys, at(bar, beat) + voice * 0.018, epiano(note, length * BEAT, vel * rng.uniform(0.85, 1.0)))
        # Bass: root, root, a passing fifth into the next bar.
        for beat, note, length in ((0.0, root, 1.4), (2.5 + SWING, root, 0.8), (3.5 + SWING, root + 7, 0.45)):
            add(low, at(bar, beat), bass(note, length * BEAT, rng.uniform(0.8, 0.95)))
        # Drums: soft kick, brushed snare on 2 and 4, quiet swung hats.
        add(drums, at(bar, 0), kick(1.0))
        add(drums, at(bar, 2.5 + SWING), kick(0.6))
        for beat in (1, 3):
            add(drums, at(bar, beat), noise_burst(rng, 0.22, 24, 2600, rng.uniform(0.22, 0.28), attack=0.008))
        for eighth in range(8):
            beat = eighth / 2 + (SWING if eighth % 2 else 0)
            vel = 0.11 if eighth % 2 else 0.07
            add(drums, at(bar, beat), highpass(noise_burst(rng, 0.06, 70, 9000, vel), 5000))

    for bar, beat, note, length in MELODY:
        add(lead, at(bar, beat), vibes(note, (length + 1.2) * BEAT, 0.9))

    lowpass(keys, 2400)
    lowpass(low, 700)
    lowpass(lead, 3000)
    mix = [k * 0.13 + b * 0.30 + d * 0.30 + m * 0.10 for k, b, d, m in zip(keys, low, drums, lead)]

    # Vinyl crackle: sparse soft ticks.
    t = 0.0
    while t < len(mix) / RATE - 0.01:
        t += rng.expovariate(5)
        add(mix, t, [rng.uniform(-1, 1) * 0.03, rng.uniform(-1, 1) * 0.015])
    return lowpass(mix, 5200)


if __name__ == '__main__':
    save('cafe_loop.wav', render_music(), 0.55)
    print('Rendered cafe_loop into assets/audio/.')
