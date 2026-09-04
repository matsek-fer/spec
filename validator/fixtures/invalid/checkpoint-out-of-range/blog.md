---
schema_version: "1.0"
section_concepts:
  "#odjeljak": []
checkpoints:
  - after: "#odjeljak"
    ask: "Pitanje s neispravnim indeksom točnog odgovora?"
    options:
      - "Prvi odgovor."
      - "Drugi odgovor."
    correct: 2
    if_wrong:
      goto: "#odjeljak"
---

# Naslov

## Odjeljak

Tijelo odjeljka.
