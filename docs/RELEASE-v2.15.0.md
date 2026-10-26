# Chișinău 3D Native Metal v2.15.0

Această versiune extinde verificarea anti-blinking de la duplicate exacte la toate suprafețele coplanare din oraș și aliniază randarea nativă cu regulile de vizibilitate ale proiectului online.

## Verificare în toate zonele

- auditul exhaustiv a parcurs toate cele 222 de dale detaliate și 12.337.709 triunghiuri;
- au fost identificate 147.752 de perechi coplanare cu material sau culoare diferită, inclusiv suprafețe triangulate diferit care nu apăreau în vechiul control de duplicate;
- 119.664 de perechi sunt separate prin aceeași regulă FrontSide/BackSide folosită de scena Three.js;
- 28.064 de perechi sunt ordonate stabil după strat și triunghi, iar ultimele 24 după culoarea sursei;
- rezultatul final este 0 perechi și 0 dale cu risc de blinking nerezolvat;
- auditul anterior de duplicate exacte rămâne la 0 în întregul oraș și în raza Nr1/Lev Tolstoi.

## Renderer și performanță

- bufferul de adâncime folosește reversed-Z pe întreaga vizibilitate fără fog de 7 km;
- geometria `BackSide` și `DoubleSide` este pregătită offline, iar Metal poate elimina fețele ascunse direct în hardware;
- straturile noi și suprafețele foto au o ordine de adâncime deterministă față de geometria veche;
- încărcările Metal sunt împărțite în pagini de maximum 180 KB pentru a evita vârfurile de cadru în zbor.

## Rezultatele testelor

Pe sistemul de verificare Apple M1 Pro, toate traseele de 22 de secunde au avut 0 cadre peste 25 ms, iar toate dalele detaliate apropiate au fost pregătite:

- Centru: 119,95 FPS, p95 9,60 ms, maxim 15,23 ms;
- Columna: 118,40 FPS, p95 10,20 ms, maxim 21,60 ms;
- Șciusev: 119,64 FPS, p95 9,66 ms, maxim 17,01 ms;
- București: 120,00 FPS, p95 9,42 ms, maxim 13,87 ms;
- mașină: 119,53 FPS, p95 9,54 ms, maxim 17,80 ms.

Au trecut și testele pentru mersul personajului, intrarea/ieșirea din vehicule, generarea mașinii și elicopterului, harta offline și teleportarea.

## Instalare

Descarcă arhiva ZIP, dezarhiveaz-o complet și deschide `Start.command`. Jocul rulează offline pe macOS 12 sau mai nou, pe Apple Silicon și Intel.
