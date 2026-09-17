import re

# Colombian plates have a fixed, known structure — much stronger than generic
# OCR heuristics. Private/public vehicles: 3 letters + 3 digits (e.g. JXV321).
# Motorcycles: 3 letters + 2 digits + 1 letter (e.g. ABC12D). Knowing which
# position must be a letter vs. a digit lets us correct the classic OCR
# look-alike confusions (O/0, I/1, S/5, B/8, G/6, Z/2) deterministically,
# instead of guessing — this never invents a plate, it only resolves an
# ambiguous glyph using where in the string it appears.
_CAR_PATTERN = re.compile(r"^[A-Z]{3}[0-9]{3}$")
_MOTO_PATTERN = re.compile(r"^[A-Z]{3}[0-9]{2}[A-Z]$")
# Requires at least one digit — a plate always has one, which is what keeps
# this from matching the city/country name printed under the code (e.g.
# "COLOMBIA", "BOGOTA"), which EasyOCR often reads more confidently than the
# code itself since they're common dictionary words.
_FALLBACK_PATTERN = re.compile(r"^(?=.*[0-9])[A-Z0-9]{5,8}$")

_DIGIT_TO_LETTER = {"0": "O", "1": "I", "5": "S", "8": "B", "6": "G", "2": "Z"}
_LETTER_TO_DIGIT = {v: k for k, v in _DIGIT_TO_LETTER.items()}


class PlateNormalizer:
    """Normalizes raw OCR output into a clean plate string and checks plausibility."""

    def normalize(self, raw_text: str) -> str:
        text = raw_text.upper()
        return re.sub(r"[^A-Z0-9]", "", text)

    def is_plausible(self, normalized_text: str) -> bool:
        return bool(
            _CAR_PATTERN.match(normalized_text)
            or _MOTO_PATTERN.match(normalized_text)
            or _FALLBACK_PATTERN.match(normalized_text)
        )

    def is_colombian_format(self, normalized_text: str) -> bool:
        """Stricter than is_plausible — matches only the exact Colombian
        LLLNNN/LLLNNL shape, not the generic 5-8 alnum fallback. Used to
        prefer a real plate-shaped read over an unrelated bit of text (e.g. a
        badge or logo) that happens to also pass the loose fallback check.
        """
        return bool(_CAR_PATTERN.match(normalized_text) or _MOTO_PATTERN.match(normalized_text))

    def fit_colombian_format(self, text: str) -> str | None:
        """Tries to reshape an OCR read into a valid Colombian plate by fixing
        only characters that are ambiguous for the slot they're in (e.g. an
        'O' where a digit is expected becomes '0'). A 7-char read is also
        tried with one character trimmed from either end first — a stray
        screw/dot on the plate is a common source of one extra character.
        Among every way that fits, keeps the one needing the fewest character
        substitutions — an exact fit beats one built out of guessed corrections.
        Returns None if nothing fits any known Colombian pattern.
        """
        candidates = [text]
        if len(text) == 7:
            candidates += [text[:-1], text[1:]]

        best: tuple[str, int] | None = None  # (fitted, substitutions)
        for candidate in candidates:
            if len(candidate) != 6:
                continue
            for template, pattern in (("LLLNNN", _CAR_PATTERN), ("LLLNNL", _MOTO_PATTERN)):
                fitted, substitutions = self._fit(candidate, template)
                if pattern.match(fitted) and (best is None or substitutions < best[1]):
                    best = (fitted, substitutions)

        return best[0] if best else None

    @staticmethod
    def _fit(text: str, template: str) -> tuple[str, int]:
        chars = []
        substitutions = 0
        for char, slot in zip(text, template):
            expected_map = _DIGIT_TO_LETTER if slot == "L" else _LETTER_TO_DIGIT
            fixed = expected_map.get(char, char)
            substitutions += fixed != char
            chars.append(fixed)
        return "".join(chars), substitutions
