# Chișinău 3D Native Metal v2.10.0

Această versiune elimină complet fog-ul de distanță și păstrează orașul vizibil până la orizont.

## Modificări

- fog-ul a fost eliminat din shaderul Metal;
- distanța camerei este de 7 km, peste întinderea de 6,6 km a hărții offline;
- orașul de bază se încarcă progresiv până la limita hărții și nu mai este evacuat la distanță mică;
- dalele aflate în spatele camerei sau complet în afara câmpului vizual nu sunt randate;
- uploadurile orașului îndepărtat sunt limitate la unul pe cadru;
- memoria brută a dalelor dense este eliberată pe un fir de fundal, fără blocarea randării;
- reparația clădirilor închise și generarea vehiculelor din v2.9.0 sunt păstrate.

## Verificări fără fog

- Centru: 59,97 FPS, p95 17,86 ms, maxim 24,32 ms, zero cadre peste 25 ms;
- Șciusev: 59,98 FPS, p95 17,89 ms, maxim 24,99 ms, zero cadre peste 25 ms;
- mașină: 60 FPS, p95 17,86 ms, maxim 22,85 ms, zero cadre peste 25 ms;
- generarea vehiculelor, intrarea/ieșirea, harta și teleportarea: trecute.

## Instalare

Descarcă arhiva ZIP, dezarhiveaz-o complet și deschide `Start.command`. Jocul rulează offline pe macOS 12 sau mai nou și include arhitecturile `arm64` și `x86_64`.

SHA-256:

`bb791762257d1389285e3f485bd2ae92fe3143891404ef724a6bf1a182f272ec`

Checksum-ul este disponibil și ca fișier separat în Release.
