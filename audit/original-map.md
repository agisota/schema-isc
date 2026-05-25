# Original scheme — canonical map (source of truth)

Reconstructed from the supplied source artifacts. No raster tools
(`gs`/`pdftoppm`/`convert`/`inkscape`) are available in this environment, so the
map is built from the pipeline's already-extracted text+geometry layers rather
than a pixel render of the `.ai`:

- `data/top-2026-05-04.json` — 1:1 transfer of the top scheme (15550×2041 px),
  node positions + labels + colors.
- `go_1.zip:data/scheme-top.json`, `go_1.zip:isc-integrated-v3.json` — stage
  names, durations, legend, stage shelves.
- `*.idml` (a zip) `Stories/*.xml` — raw text layer.

> Limitation: pixel-exact visual parity to the `.ai` cannot be auto-verified
> here. See `visual-parity.md`.

## The 5 stages (canonical)

| # | Name | Headline duration | Route legend |
|---|------|-------------------|--------------|
| 1 | Приобретение прав на ОКН / земельный участок (в т.ч. из гос./мун. собственности) | до 292 дн. | внебюджет (navy) · ОКН (gray) |
| 2 | Выдача сведений/документов/материалов для ИИ, АСП, строительства, реконструкции ОКС | до 108 дн. | внебюджет |
| 3 | Выполнение инженерных изысканий и архитектурно-строительное проектирование | до 365 дн. | внебюджет · бюджет (green) |
| 4 | Строительство, реконструкция ОКС, ввод в эксплуатацию | до 469 дн. | внебюджет · бюджет |
| 5 | Государственный кадастровый учёт, регистрация прав, начало эксплуатации | до 16 дн. | внебюджет |

Route legend (from `cockpit.legend` / `index.html`): **внебюджет = navy `#1b2e58`**,
**бюджет = green `#2b7832`**, **ОКН (сохранение объектов культурного наследия) = gray `#6b7280`**.

## Stage 5 — canonical content (the corrected target)

Verified present in `isc-integrated-v3.json` (counts of label occurrences):
`Объект создан`, `Кадастровый учёт`, `Регистрация прав`, `Выписка из ЕГРН`,
`Начало эксплуатации`. Canonical chain:

```
Объект построен (РВ / ввод в эксплуатацию — конец Этапа 4)
        │
        ▼   Этап 5 (ФЗ-218 «О гос. регистрации недвижимости»)
Технический план → Кадастровый учёт (7 дн.) → Регистрация прав (9 дн.)
        → Выписка из ЕГРН → Объект создан → Начало эксплуатации
```

Engineering networks (ТУ / договор с РСО / временное подключение / акт о
подключении / перенос-вынос сетей for электро/тепло/вода/газ/водоотведение/связь)
belong to the **construction phase (Этап 4)** — interaction with
ресурсоснабжающими организациями — **not** the final cadastral stage.

## Footnotes carried by the original (to surface in inspector — Phase 3)

- `*` За исключением случаев, предусмотренных ст. 3.3 ФЗ-137 от 25.10.2001.
- `**` За исключением случаев, если ЗУ предоставлен в аренду (п.5 ст. 14.4 ЗК РФ).

## Duration flags in the original (blue "СРОК: N дн." badges)

30 / 60 / 7 / 9 / 14 / 15 / 75 / 90 / 180 / до 180 / 306 / до 2 лет / до 3 лет.
Most already live on nodes as `data.duration`; the standalone badges are a
Phase 3 rendering concern (`durationBadge` element kind).
