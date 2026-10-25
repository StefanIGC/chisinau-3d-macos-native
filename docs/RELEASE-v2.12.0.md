# Chișinău 3D Native Metal v2.12.0

Această versiune elimină z-fighting-ul dintre orașul de autor și geometriile vechi de fundal. Fiecare drum, trotuar, curte și spațiu plantat reconstruit exportă acum conturul exact pe care îl deține; compilatorul păstrează fallback-ul numai în afara acestor contururi.

## Corecții anti-blinking

- 10.418 măști de proprietate ale suprafețelor noi sunt aplicate automat întregii lumi;
- au fost eliminate din sectoarele reconstruite 274.432 fragmente de drum, 552.625 fragmente de landcover, 21.735 fragmente de teren, 1.894 de copaci, 6.026 de fragmente de gard/zid, 10.699 fragmente de apă și 542 de obiecte stradale vechi;
- compilatorul elimină și copiile identice din interiorul exportului de autor: 31.909 triunghiuri de suprafață duplicate nu mai ajung pe GPU;
- terenul generic de fundal este coborât la −0,18 m și decupat sub suprafețele noi, pentru a evita reapariția sa la distanță;
- geometriile vechi rămân intacte în zonele care nu au încă un înlocuitor de autor.

La București × Armenească, auditul pe o rază de 95 m confirmă că versiunea nouă este proprietarul suprafeței. Au fost retrase local 568 fragmente de drum, 366 fragmente de spațiu verde și 135 fragmente de teren vechi. Scanarea rezultatului compilat găsește zero triunghiuri vizibile duplicate în această zonă.

## Dimensiune și performanță

- lumea de fundal a scăzut de la 6.317.382 la 5.409.459 vârfuri;
- arhitectura de autor rămâne completă: 190 straturi, 15.305 mesh-uri și 701.412 vârfuri de corpuri solide;
- detaliul este compilat în 222 de dale, iar fundalul în 240 de dale;
- eliberarea dalelor dense din Metal este acum incrementală (un singur
  fragment pe cadru), evitând vârful periodic produs de evacuarea integrală;
- aplicația rămâne nativă Metal, universală `arm64` + `x86_64`, complet offline, fără fog și cu distanță de vizibilitate de 7 km.

## Verificare

`docs/WORLD-AUDIT.json` verifică inventarul Șciusev/București/Columna, măștile de proprietate, eliminarea fallback-urilor și scanarea anti-blinking de la Armenească. Pe traseul București, testul final a menținut 60 FPS, p95 17,96 ms, toate cele 16 dale apropiate pregătite și zero cadre peste 34 ms. Testele funcționale pentru pieton, intrarea/ieșirea din vehicule, harta/teleportarea și generarea mașinii și elicopterului au trecut.

## Instalare

Descarcă arhiva ZIP, dezarhiveaz-o complet și deschide `Start.command`. Jocul rulează offline pe macOS 12 sau mai nou.
