# Chișinău 3D Native Metal v2.11.0

Această versiune repară auditul de paritate dintre proiectul online și exportul nativ. Elementele vizibile care lipseau din export au fost restaurate fără a readuce geometriile duplicate.

## Elemente restaurate

- 5 familii de autor: Guvernul, Columna Pușkin–Bodoni, Parcul Catedralei, terenul Operei și parcările centrale de biciclete;
- modelul GLB detaliat al Teatrului de Operă, folosind transformarea anisotropică exactă din scena online;
- 6.385 de garduri și ziduri, 258 de cursuri de apă, 69 de aliniamente de arbori, 140 de suprafețe de drum, 472 de căi ferate și 828 de obiecte de mobilier/monumente din datele vectoriale;
- corpurile solide ale clădirilor rămân active: 701.412 vârfuri de pereți și acoperișuri sub fațadele detaliate.

Scuarul Catedralei importat vechi nu mai este compilat separat, fiind înlocuit de Parcul Catedralei de autor. Cele cinci straturi temporare București numite „reprezentare” și cele 2.790 de clădiri OSM suprapuse rămân intenționat eliminate: sunt duplicate, nu conținut lipsă.

## Randare și streaming

- 190 de straturi de autor, 15.305 mesh-uri și 36.567.828 de vârfuri sunt compilate în 222 de dale de detaliu;
- dalele de fundal sunt citite cu prioritate redusă, iar detaliul apropiat rămâne prioritar, reducând concurența cu randarea în zbor;
- fișierele mari sunt citite în blocuri eșalonate, fără inițializarea bruscă a 10–20 MB de memorie unificată;
- shaderul nu mai evaluează texturi și zgomot procedural după estomparea completă a microdetaliului, fără schimbarea imaginii;
- fiecare dală conține un index spațial de coliziuni 10×10 precalculat; mașina, pietonul și elicopterul nu mai scanează toate cele 231.004 segmente;
- MetalKit prezintă până la 120 Hz pe ecranele ProMotion și revine automat la rata disponibilă;
- fog-ul rămâne dezactivat și distanța de vizibilitate rămâne 7 km;
- aplicația rulează complet offline și rămâne universală `arm64` + `x86_64`.

## Verificare

Auditul verifică explicit toate familiile și categoriile restaurate, modelul Operei, suprafețele Șciusev/București/Columna, corpurile solide și suprimarea fallback-urilor suprapuse.

Pe sistemul de verificare Apple M1 Pro, toate traseele au rulat la aproximativ 60 FPS și cu zero cadre peste 25 ms:

- Centru/elicopter: p95 18,13 ms, maxim 18,94 ms;
- Centru/mașină: p95 18,12 ms, maxim 23,84 ms;
- Columna: p95 18,28 ms, maxim 20,09 ms;
- Șciusev: p95 19,30 ms, maxim 22,99 ms;
- București: p95 17,91 ms, maxim 20,98 ms.

Testele pietonului și animației, generării vehiculelor, intrării/ieșirii și hărții/teleportării offline au trecut. Fișierele JSON brute sunt publicate în `docs/`.

## Instalare

Descarcă arhiva ZIP, dezarhiveaz-o complet și deschide `Start.command`. Jocul rulează offline pe macOS 12 sau mai nou.

SHA-256: `ca7854090c26381f778472b67a9b3680e4aa886cf8324a4f75b66fce726de5ae`
