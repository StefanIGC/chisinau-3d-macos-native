# COL-IT-01 — Strada Columna, Tighina–Ismail

Data verificării: 25 octombrie 2026.

## Limite și geometrie

- Tronson: Strada Columna, de la racordul cu Strada Tighina până la racordul cu Strada Ismail.
- Coordonate locale aproximative: `x=1203…1426`, axa carosabilului `z=-346.3…-348.1`.
- Geoportal oficial AGCC/FNDG: <https://geodata.gov.md/_v/2026101914/#/viewer/openlayers/99>.
- Straturi inspectate: `2.1. Clădiri cadastrale`, `2.2. Terenuri cadastrale`, `6.7. Punctul de adresa a construcției` și ortofoto cu selectorul vizibil `2016 / 2020 / 2021`.
- Verificare punctuală: adresa `mun. Chișinău, str. Columna 46/1`, apoi vedere la scara 1:2304 asupra întregului tronson.
- Geometria de lucru este stocată numai pentru corpurile de clădire. Parcelele și punctele de adresă sunt folosite exclusiv pentru verificare și proveniență.
- Contururile OSM curente au fost descărcate la 25 octombrie 2026 și comparate vizual cu corpurile oficiale și ortofotoplanul. Ele furnizează identificatorii de înlocuire necesari motorului Streets GL.

Geoportalul nu furnizează aici un atribut de înălțime confirmat. Toate înălțimile, nivelurile, pantele acoperișurilor și dimensiunile verticale din catalog sunt marcate drept estimări.

## Imagini stradale

Google Maps, interfața publică: <https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=47.01872%2C28.84780>.

- Panorame publicate de `Constantin P.`, datate `apr. 2025`.
- Poziții verificate: intersecția Tighina–Columna, mijlocul tronsonului și apropierea intersecției Columna–Ismail; la pozițiile Tighina și mijloc au fost verificate două direcții opuse.
- Interfața afișează simultan avertismentul `Nu există imagini Street View disponibile`. Imaginile accesibile sunt panorame publice punctuale, nu traseul oficial continuu Street View. Nu este presupusă continuitatea între puncte.

Detalii confirmate vizual în aprilie 2025: fronturi predominant cu unul și două niveluri; tencuieli gri, crem, roz și cărămiziu; acoperișuri în pantă joasă; ferestre și uși individuale; vitrine locale; trotuare din pavele și asfalt reparat; borduri înalte; marcaje și treceri; arbori maturi plantați neregulat; stâlpi curbați de iluminat; cabluri aeriene dense; indicatoare pietonale; lanțuri joase între bolarzi; containere stradale.

Nu sunt reproduse automobilele sau persoanele surprinse în panorame.

## Separarea faptelor de estimări

Confirmate: poziția și forma în plan a corpurilor, anexelor și retragerilor; traseul străzii; sensul unic și cele două benzi OSM; racordurile Tighina și Ismail; pozițiile trecerilor OSM; familiile vizuale enumerate mai sus.

Estimate: înălțimea metrică a fiecărui corp, geometria exactă a șarpantelor, culoarea fațadelor ascunse, porțile interioare, mobilierul mascat de arbori/vehicule și pozițiile centimetrice ale vegetației. Corpurile de curte nevizibile primesc elevații conservative și nicio fațadă inventată.

## Implementare

- `data/columna-ismail-tighina-buildings.json`: 66 de corpuri și anexe, dintre care 15 fronturi stradale detaliate.
- `data/columna-ismail-tighina.json`: carosabil, trotuare, treceri, vegetație, porți, stâlpi, rețele aeriene și utilități.
- `app/columna-ismail-tighina.ts`: corpuri complete cu coliziune, înlocuire atomică a geometriei Streets GL, fațade opace, spațiu public, mobilier și LOD incremental.

Modelele vechi rămân vizibile până când corpul nou și coliziunea lui sunt pregătite; înlocuirea folosește ID-urile OSM și evită suprapunerea. Drumurile și suprafețele noi folosesc cote ușor separate și materiale opace pentru a evita pâlpâirea z-fighting.
