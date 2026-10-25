# Chișinău 3D pentru macOS

Joc open-world 3D construit din proiectul „Chișinău · Centru 3D”. Orașul, harta, clădirile, reperele, modelele și datele de coliziune sunt incluse local în aplicație.

Versiunea 1.2 include local texturile și modelele Streets GL, elimină frânarea artificială în timpul încărcării și mută reconstrucția decorului în felii scurte, cu prioritate permanentă pentru mișcare și cameră.

## Comenzi

- `W A S D` — deplasare / control vehicul
- mouse — privește în jur
- `E` — interacțiune, urcă sau coboară
- `Spațiu` — sari / urcă cu elicopterul
- `Shift` — aleargă / zbor rapid
- `V` — schimbă camera
- `M` — hartă
- `Tab` sau `Esc` — meniu și pauză

Din meniu poți genera mașina sau elicopterul, schimba perspectiva, activa sunetul și reseta poziția la Catedrală.

## Date și licențe

Sursele și licențele sunt disponibile în meniul jocului și în `ASSETS.md`. Extinderea dincolo de zona centrală și stratul Streets GL pot folosi internetul; nucleul central și activele de joc sunt incluse local.

## Dezvoltare

```bash
npm install
npm run dev
```

Pentru o nouă versiune universală (Apple Silicon și Intel):

```bash
npm run package:mac
```
