# Architecture rules
- Product-tour replay hands off through a session-scoped pending flag and Home navigation state; Home starts the queued tour only after a real reading renders, so Settings unmounting cannot discard replay.
- Home scene fact bubbles portal into the scene container above the HUD; other embeds retain local positioning, so readable facts do not compete with gauge text.