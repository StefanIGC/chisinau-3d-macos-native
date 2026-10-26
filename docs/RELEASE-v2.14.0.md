# Chișinău 3D Native Metal v2.14.0

Această versiune elimină suprapunerile de clădiri observate pe strada București, inclusiv în complexul Nr1 de lângă strada Lev Tolstoi, și repară golurile de teren care puteau rămâne după retragerea stratului vechi.

## Clădiri fără blinking

- compilatorul înregistrează 1.767 de amprente solide din straturile reconstruite și le acordă prioritate față de clădirile cadastrale FNDG;
- au fost eliminate 20.782 de triunghiuri ale corpurilor vechi numai în zonele unde există un volum nou complet;
- toate familiile vizuale, nu doar asfaltul și trotuarele, sunt deduplicate la precizie de un milimetru;
- au fost eliminate încă 114.963 de triunghiuri coplanare duplicate: 31.983 din suprafețe și 82.980 din clădiri și obiecte;
- auditul binar găsește zero duplicate vizibile în întregul oraș și zero în cele 505.007 triunghiuri din raza de 160 m verificată la Nr1/Lev Tolstoi.

## Teren continuu

- toate cele 240 de dale de bază conțin un underlay continuu;
- underlay-ul este la `-0,18 m`, separat de drumuri, trotuare, curți și spații verzi, deci umple un eventual gol fără să producă z-fighting;
- stratul rămâne prezent și sub zonele reconstruite când detaliul apropiat încă se încarcă.

## Verificare

Auditul lumii a trecut cu 240/240 dale acoperite și zero duplicate vizibile. Traseul automat cu elicopterul peste București a rulat 22 de secunde la 119,84 FPS mediu, p95 9,61 ms, cu toate cele 16 dale apropiate pregătite și zero cadre peste 25 ms.

## Instalare

Descarcă arhiva ZIP, dezarhiveaz-o complet și deschide `Start.command`. Jocul rulează offline pe macOS 12 sau mai nou, pe Apple Silicon și Intel.
