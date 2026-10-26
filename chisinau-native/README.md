# Chișinău 3D · motor nativ Metal

Aplicație macOS nativă, fără Electron, Chromium, JavaScript sau conexiune la internet în timpul jocului.

## Arhitectură

- C++20 și Objective-C++ numai pentru integrarea AppKit/MetalKit.
- Un singur renderer Metal, cu o singură trecere de culoare și depth buffer.
- 240 de sectoare de bază și 222 de pagini locale pentru arhitectura detaliată.
- 190 de straturi arhitecturale prioritare sunt exportate direct din modulele originale construite după fotografii și Street View: fațade, ferestre, uși, balcoane, cornișe, acoperișuri, scări, porți, mobilier și suprafețele complete Șciusev, București și Columna–Ismail. Exportul include din nou Guvernul, Columna Pușkin–Bodoni, Parcul Catedralei, terenul Operei și parcările centrale de biciclete. Cele cinci straturi temporare „reprezentare” rămân excluse deoarece sunt duplicate reale.
- Exportul arhitecturii rulează numai la build; aplicația livrată rămâne integral nativă.
- Geometrie gata pentru GPU; nu se triangulează clădiri în timpul jocului.
- Streaming asincron pe două niveluri: orașul de bază se încarcă până la limita hărții și rămâne vizibil la orizont, iar cele 36,8 milioane de vârfuri de detaliu sunt anticipate în direcția deplasării și încărcate numai în apropiere. Citirea fundalului folosește prioritate redusă, ca să nu concureze cu fizica și randarea.
- Fără fog de distanță; camera și orașul de bază au vizibilitate de 7 km.
- Trei moduri: pieton, mașină și elicopter.
- Din modul pieton, `2` generează mașina, iar `3` generează elicopterul într-un loc liber din apropiere; `E` permite intrarea și ieșirea.
- Corpurile solide, pereții și acoperișurile clădirilor sunt păstrate sub fațadele detaliate; fallback-urile OSM suprapuse rămân eliminate.
- Cele 1.767 de amprente ale corpurilor noi au prioritate față de stratul cadastral FNDG: compilatorul elimină numai triunghiurile vechi din acele amprente și deduplică apoi întreaga geometrie vizibilă la precizie de un milimetru.
- Fiecare dală de bază conține un teren de siguranță continuu la `-0,18 m`; acesta nu poate concura cu suprafața reală în depth buffer, dar împiedică apariția golurilor în timpul streamingului.
- Exportul de bază păstrează gardurile, zidurile, apa, aliniamentele de arbori, suprafețele de drum, căile ferate și mobilierul urban pe care scena online le desenează. Modelul detaliat al Operei este compilat cu transformarea lui exactă.
- Fizică deterministă la 120 Hz pentru vehicule, independentă de rata cadrelor.
- Prezentare de până la 120 Hz pe ecranele ProMotion și index spațial de coliziuni precalculat în fiecare dală.
- Mașina folosește un model bicycle: accelerație, frânare, marșarier automat, limitarea direcției la viteză și frână de mână.
- Elicopterul are rotor cu pornire progresivă, decolare/aterizare, inerție, atitudine și coliziuni sub-pas.
- Modelele skinned sunt convertite în bind pose, iar textura originală alb-albastră a elicopterului este coaptă în culorile vârfurilor.
- Axele fizicii, modelului, camerei și minimapei folosesc aceeași convenție; vehiculele se deplasează exact în direcția în care sunt orientate.

## Build

```sh
./build.sh ../chisinau-macos --rebuild-world
```

Rezultatul este `build/Chișinău 3D Native/Chișinău 3D.app`, universal arm64 și x86_64.

## Benchmark

```sh
"build/Chișinău 3D Native/Chișinău 3D.app/Contents/MacOS/Chisinau3DNative" --benchmark
```

Testul zboară automat 22 de secunde, traversează mai multe sectoare și scrie rezultatul în `/tmp/chisinau-native-benchmark.json`.

Fizica mașinii și randarea ei pot fi testate separat cu `--benchmark-car`; rezultatul se scrie în `/tmp/chisinau-native-benchmark-car.json`.

Traseul nou Columna, de la Tighina spre Ismail, se verifică separat cu `--benchmark-columna`; rezultatul se scrie în `/tmp/chisinau-native-benchmark-columna.json`.

Șciusev și București se verifică separat cu `--benchmark-sciusev` și `--benchmark-bucuresti`. Harta, pietonul și interacțiunile se verifică prin `--test-map`, `--test-walker` și `--test-interaction`.

Generarea sigură a vehiculelor se verifică prin `--test-spawn`.
