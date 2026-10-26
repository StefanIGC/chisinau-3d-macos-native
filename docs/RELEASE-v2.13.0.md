# Chișinău 3D Native Metal v2.13.0

Această versiune restaurează în ediția nativă registrul complet de porți de curte din proiectul online. Exportul anterior păstra stâlpii generați prin `streetMesh`, dar omitea canaturile deoarece acestea sunt grupuri independente, rotite separat de sistemul interactiv din browser.

## Porți restaurate

- toate cele 178 de porți din `courtyard-gates.json` sunt exportate în poziția și starea inițială definite de proiect;
- sunt păstrate cele 354 de canaturi distincte, inclusiv porțile metalice ornamentale, panourile vopsite, lemnul, barele verticale, lamelele orizontale și portițele cu un singur canat;
- cele patru porți documentate deschise rămân deschise și traversabile;
- pentru cele 174 de porți închise, coliziunea este încărcată împreună cu dala vizuală, astfel încât nu apar obstacole invizibile înaintea geometriei;
- porțile construite deja direct în modulele Șciusev, București, Columna și Alecsandri nu sunt duplicate.

## Verificare

Auditul compară acum catalogul sursă cu manifestul exportat, numărul de canaturi și coliziunile din dalele native. Corecțiile anti-blinking din v2.12.0 rămân active și sunt reverificate împreună cu fizica pietonului, vehiculele, harta și teleportarea.

## Instalare

Descarcă arhiva ZIP, dezarhiveaz-o complet și deschide `Start.command`. Jocul rulează offline pe macOS 12 sau mai nou, pe Apple Silicon și Intel.
