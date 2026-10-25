# Chișinău 3D Native Metal v2.8.0

Versiune completă pentru macOS, cu motor nativ C++/Metal și datele orașului incluse local.

## Instalare

1. Descarcă arhiva `Chisinau-3D-macOS-Native-Metal-v2.8.0.zip`.
2. Dezarhivează fișierul.
3. Deschide `Start.command` din dosarul rezultat.

Jocul nu are nevoie de conexiune la internet după descărcare.

## Conținut principal

- hartă cu teleportare și puncte pentru Șciusev, București, Columna și Centru;
- deplasare pe jos, mașină și elicopter, cu intrare și ieșire din vehicule;
- geometria nouă are prioritate în sectoarele reconstruite, pentru eliminarea suprapunerilor și a pâlpâirii;
- streaming gradual al orașului, niveluri de detaliu, ceață și optimizări pentru deplasarea rapidă;
- pachet universal pentru Mac-uri Apple Silicon și Intel;
- resurse locale pentru rulare offline.

## Verificări

- semnătura aplicației: validă;
- arhitecturi: `arm64` și `x86_64`;
- teste automate pentru hartă, interacțiuni, mers și segmentul Columna: trecute;
- teste de performanță: aproximativ 60 FPS în sectoarele verificate, fără cadre peste 25 ms în traseele principale testate.

## Integritate

SHA-256 pentru arhivă:

`2de8381e369b25708ec2d8f420083321f966a4815fbe76e09e287c000ff5e8aa`

Fișierul `.sha256` atașat Release-ului poate fi folosit pentru verificarea automată.
