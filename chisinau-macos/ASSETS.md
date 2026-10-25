# Chișinău 3D assets and references

Street, path, park and building footprints follow an OpenStreetMap snapshot at local metre scale. Landmark architecture is rebuilt from photographs. Unspecified building heights, ordinary façades, terrain elevation and smaller decorative details remain interpretative; this is not a photogrammetric digital twin.

- Landmark architecture: https://visit.chisinau.md/en/obiective_turistice/catedrala-nasterea-domnului-clopotnita-arcul-de-triumf/
- Visual building references: Diego Delso, Wikimedia Commons (2023). Reference photography is not redistributed in the site.
- Statue reference: M. D. Shahinyan, Wikimedia Commons (2024). Reference photography is not redistributed in the site.
- Walker: Soldier.glb, Vanguard model and Idle/Walk/Run animations, Mixamo, distributed in the Three.js examples: https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb
- Grass texture: Three.js examples, https://threejs.org/examples/textures/terrain/grasslight-big.jpg
- All other textures are generated locally by the scene.

The experience is independent and is not associated with Rockstar Games or GTA.

## User-provided Prius

- Toyota Prius (XW20) 2003, by Nieve5677 / iori308408. Source embedded in the uploaded GLB: https://sketchfab.com/3d-models/toyota-prius-xw20-2003-2df94f0aa23d43b89eda64f031310620
- License: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/ . The in-game controls panel also provides attribution and license links.
- Derived asset: `public/prius.glb`. Geometry converted to metres and upright axes, material groups merged, four independent wheel assemblies extracted, and meshoptimizer simplification applied. Materials and lights are adapted at runtime. Original: 40,751,112 bytes / 1,291,934 triangles; optimized: 6,121,992 bytes / 268,395 triangles. No external geometry decoder is required.
- Driving reference: Toyota, “Toyota Prius Paves The Way Ahead”, 2 December 2003, https://media.toyota.co.uk/toyota-prius-paves-the-way-ahead/ . Targets: 2.7 m wheelbase, approximately 10.9 s 0–100 km/h, 170 km/h, continuous hybrid power delivery and regenerative braking.
- The supplied body is the 2003 XW20; its driving is tuned to approximate the same second-generation Prius family, including 2006. This is a simplified game model, with illustrative battery energy, not an engineering simulator. All vehicle sounds are synthesized locally.

## User-provided AK-47

- AK-47 by lokeig. Source embedded in the uploaded GLB: https://sketchfab.com/3d-models/ak-47-384565b1779c450b90397232163e4e6d
- License: Creative Commons Attribution–NonCommercial 4.0, https://creativecommons.org/licenses/by-nc/4.0/ . Attribution and license are also linked in the in-game controls panel. This game has no commercial features.
- Original uploaded model is retained as `public/ak47.glb` (4,858,380 bytes, 17,392 triangles, three 1024×1024 textures). At runtime geometry is centred, scaled and oriented for the game, then merged into a body and a movable magazine. The uploaded original is untouched.
- Projectile speed, spread, recoil, ammunition and reload timing are arcade gameplay choices. They are not a real-world ballistics or firearms training model. Sounds and effects are generated locally.

## Central map update · 21 September 2026

- Geographic database: © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright . Public source: https://api.openstreetmap.org/api/0.6/map?bbox=28.823,47.019,28.841,47.031 . The derived database is provided under the same license at `/central-chisinau.json`; the map and controls display attribution and a download link.
- Reproduction: `python scripts/import-city.py central-chisinau.osm`, then copy `data/central-chisinau.json` to `public/central-chisinau.json`. Coordinates are projected into local metres and rotated along the actual arch–cathedral axis. The footprint centroid, rather than an offset tourism label pin, anchors the arch.
- Satellite composition reference: the Google Maps view supplied by the user, https://www.google.com/maps/@47.02435,28.831837,911m/data=!3m1!1e3 . Reviewed visually; no Google imagery or 3D data is redistributed or used as a texture.
- Includes mapped streets, pedestrian alleys, park outlines, building polygons and courtyards, crossings, fountains, trees, benches, lighting and fences. Maps and photographs can differ in date, coverage and accuracy; only mapped attributes are treated as measured geometry.

Building appearance references (photographs are not redistributed):

- Government: https://dgacg.md/cladirea-guvernului/
- Parliament: https://vizite.parlament.md/en/parliament-of-the-republic-of-moldova/
- Presidency: https://visit.chisinau.md/en/obiective_turistice/cladirea-presedintiei-republicii-moldova-bd-stefan-cel-mare-si-sfant-154/
- Opera: https://visit.chisinau.md/en/obiective_turistice/teatrul-national-de-opera-si-balet-maria-biesu/
- History museum: https://www.nationalmuseum.md/en/history/
- Art museum, Dadiani building: https://www.mnam.md/en/offices
- City Hall: https://visit.chisinau.md/en/obiective_turistice/cladirea-primariei-municipiului-chisinau-bd-stefan-cel-mare-si-sfant-83/
- Organ Hall: https://visit.chisinau.md/en/audio/sala-cu-orga/
- Radisson Blu Leogrand: https://www.radissonhotels.com/en-us/hotels/radisson-blu-chisinau-leogrand
- Bristol: https://bristol.md/

## Traffic and impact update

- `public/prius-traffic.glb` is a further optimized derivative of the supplied Nieve5677 Prius, with 105,082 triangles. Welding, meshoptimizer simplification and pruning retain its silhouette and independent wheels. Eight differently painted instances share geometry. The author, source and CC BY 4.0 license above apply to this derivative too.
- Window panes are separated at runtime for independent breakage. Flat tyres change wheel shape, vehicle tilt and steering; traffic accelerates temporarily after impacts and respects vehicles ahead. These are simplified game responses, not real vehicle damage predictions.
- Red impact dots, feathers, glass fragments and sparks use fixed reusable particle pools. Pedestrians fall without graphic injury; hit pigeons disappear. No additional external effects assets are used.

## Visibility and performance update · 22 September 2026

- Static scenery and foliage are partitioned into 64 m cells, culled by camera and distance, and detached while inactive. Nearby foliage retains its detailed clusters; distant cells use half as many. View distance and resolution adapt to device performance. Shadows cover the nearby area and refresh at a limited rate.
- Walls and furniture share vertex-colored batches. Visible pedestrians share instanced articulated parts; distant Prius vehicles share instanced parts while retaining paint, wheel movement and individually broken windows.
- The desktop population is 96 pedestrians / 48 traffic cars; coarse-pointer devices use 64 / 32. Only nearby, visible models are rendered. Off-screen traffic position updates are reduced to twice per second. Collision queries use local spatial indexes independently of visual culling.
- Further derivatives of the same supplied Prius, with the original author and CC BY 4.0 attribution above: `prius-playable.glb` (79,482 triangles), `prius-traffic.glb` (59,168), and `prius-distant.glb` (6,124). The playable and nearby assets preserve the existing vertex attributes; the distant asset removes unused UVs and regenerates normals after simplification. The original `prius.glb` is retained in Git history; only the three runtime variants are shipped.
- Six matched scene/view checks reduced submitted main-pass geometry from 0.52–1.26 million triangles to 0.16–0.55 million, while increasing population. These are scene-workload measurements, not a measured GPU frame rate on the user's device.


## map.md landmark catalog (2026-09-25)

- 79 additional placements from the public map.md 3D catalog, using 78 distinct GLB files; Opera is retained separately. One identical Bender row is deduplicated. The incomplete seasonal Zm1 row is skipped, as it is by map.md.
- Original asset copyright notices are retained in every file and in `public/models/map-md/sources.json`. Credits include IT-Department, Andrei, roman and the other authors named by the source. No open reuse license is asserted.
- Meshopt compression, vertex reordering, removal of unused texture coordinates and bounded float quantization reduce download size. The maximum measured position error is below 5 mm. The imported models have no source textures.
- `public/models/map-md/calibration.json` records each placement’s dimension method and OSM replacement IDs. Twenty-five single-building footprints are calibrated to mapped bounds; the Arch is 13 m high per Visit Chișinău. Other proportions retain the source author’s georeferenced scale. These are not surveyed models.
- The previously unused `cathedral.glb`, `bell-tower.glb` and `grass.jpg` assets remain in Git history and are no longer shipped. The procedural startup fallback and photographed Opera/Government refinements remain active.

### Photo-guided material colours (v28)

- All 79 placements / 78 GLBs now have individual material palettes. `public/models/map-md/color-references.json` records online source pages, image URLs, building identities, architectural regions, confidence and uncertain surfaces for every placement. Photos are reference material, not redistributed textures. Winery colours use image-search descriptions; most other references were visually inspected. Hidden roofs and temporary festival structures retain explicitly marked conservative estimates.
- `data/map-md-palettes.json` and `scripts/bake-map-md-colors.mjs` reproduce the finishes from a directory of the preceding compressed GLBs. Convert reference sRGB colours to linear vertex colours, cap bright diffuse reflectance, and separate stone/render, roof, glazing, bronze, brick, wood and steel. The runtime does not recolour vertices or download textures. GLB scene metadata prevents the earlier central-landmark finishing pass from tinting these assets again.
- Preserve original scales, map anchors, transforms, surface shapes and draw counts. Positions, normals and indices are byte-identical after decoding for 77 assets. Parliament's blank facade faces are subdivided in their original planes for photographed window bays; the bake verifies coplanarity and area preservation, leaving the collision surface and bounds unchanged. Its new colour boundaries increase triangle count but do not add draw calls or material batches.
- `color-validation.json` records checksums, file sizes and material-role coverage. `compression.json` is refreshed with the coloured asset sizes and hashes while retaining the original geometric quantization bounds. Incremental loading, collision construction, frustum culling and shared native-map depth occlusion remain in place.
- These are photo-guided colour reconstructions on the existing map.md geometry, not surveyed materials or complete photogrammetric textures. The intact Philharmonic model retains its historical pre-fire appearance; approximate/unseen architectural areas are identified in the references.


## Columna photo-guided block · v30

- Only the Columna block from Pușkin to Bănulescu-Bodoni is refined. See `docs/columna-references.md` for photograph URLs, capture-date limitations, mapped dimensions and estimated details.
- References include the official municipal 2021 sidewalk and Aleea Pictorilor galleries, Visit Chișinău's 3 m art stands, Catargi photographs by Gikü (CC0) and Noi.md (2024), Nazarov in #diez (2017), Crown Plaza's Korter gallery, and the 2020 park accessibility audit. Photographs are not shipped or used as textures.
- Native OSM building footprints and local tree locations remain authoritative for placement. The photo-based Catargi and Crown street-front silhouettes override conflicting generic floor counts. Seven buildings replace eight source IDs because Catargi had a duplicate footprint. Other heights and unobserved details remain interpretations.
- New concrete/stone/wood/metal geometry is authored locally. Paving joints use a small shader with no external images. No Google Street View data or images are redistributed; the attempted Google Earth session was blocked by browser WebGL incompatibility.

## Columna Tighina–Ismail · COL-IT-01 (2026-10-25)

- The complete Columna block between Tighina and Ismail is reconstructed on both sides. Official AGCC/FNDG building and parcel layers, address points and the visible 2016/2020/2021 orthophoto selector were inspected at <https://geodata.gov.md/_v/2026101914/#/viewer/openlayers/99>.
- Current OSM building outlines provide reproducible working rings and replacement IDs after visual comparison with the official plan. Parcels and address points are evidence only and are never extruded.
- Public point panoramas by Constantin P. dated April 2025 were inspected at both intersections and mid-block. Google Maps reported that continuous Street View was unavailable, so no unavailable imagery is claimed. Reference images are not distributed or used as textures.
- 66 bodies/annexes and 15 street fronts are included. Official height attributes were unavailable; heights, hidden roofs, obscured courtyard details and exact vegetation dimensions are explicitly estimated in `data/columna-ismail-tighina-buildings.json` and `docs/columna-ismail-tighina-references.md`.
- Photographed vehicles and people are not reproduced. Existing interactive traffic, car and helicopter behavior remains independent from the reference imagery.
