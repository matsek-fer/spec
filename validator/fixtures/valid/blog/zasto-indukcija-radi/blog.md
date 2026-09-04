---
schema_version: "1.0"
section_concepts:
  "#baza-indukcije": [mathematical-induction]
  "#korak-indukcije": [mathematical-induction, natural-numbers]
  x_reader_hints: { pace: slow }
checkpoints:
  - after: "#baza-indukcije"
    ask: "Zašto baza n = 1 sama za sebe nije dokaz tvrdnje?"
    options:
      - "Jer pokriva samo jedan prirodni broj."
      - "Jer se baza uvijek dokazuje na kraju."
    correct: 0
    if_wrong:
      goto: "#baza-indukcije"
      note: "Baza je samo početni slučaj — ponovno pročitaj odjeljak."
      x_retry_limit: 2
    x_checkpoint_id: cp-baza
---

# Zašto indukcija radi

## Baza indukcije

Dokaz indukcijom počinje provjerom tvrdnje za najmanji prirodni broj,
najčešće $n = 1$. Baza je sidro: bez nje korak indukcije nema od čega
krenuti.

## Korak indukcije

Pretpostavimo da tvrdnja vrijedi za neki $n$ i iz toga izvedimo da vrijedi
za $n + 1$. Zajedno s bazom, to ruši cijeli niz domina.
