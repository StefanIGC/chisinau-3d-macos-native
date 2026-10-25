import * as Lerc from "lerc";

export default class EsriElevationFetcher {
	private static lercLoaded: boolean = false;

	public static async fetch(x: number, y: number, zoom: number): Promise<Float32Array> {
		if (!this.lercLoaded) {
			await Lerc.load({ locateFile: (path, _) => `https://cdn.jsdelivr.net/gh/StrandedKitty/streets-gl@2412c8ea85ea221356f0fe103e7a412743224120/src/resources/misc/${path}` });
			this.lercLoaded = true;
		}

		const nextZoom = zoom + 1;
		const outputSize = 512;
		const output = new Float32Array(outputSize * outputSize);

		const promises = [];

		for (let dx = 0; dx < 2; dx++) {
			for (let dy = 0; dy < 2; dy++) {
				const nextX = x * 2 + dx;
				const nextY = y * 2 + dy;

				const promise = this.loadAndDecodeHeight(nextX, nextY, nextZoom).then(pixelBlock => {
					const pixelOffsetX = dx * 256;
					const pixelOffsetY = dy * 256;

					for (let y = pixelOffsetY; y < pixelOffsetY + 256; y++) {
						for (let x = pixelOffsetX; x < pixelOffsetX + 256; x++) {
							const idx = (outputSize * y + x);

							const sourceX = x % 256 + 1;
							const sourceY = y % 256 + 1;

							output[idx] = pixelBlock.pixels[0][sourceY * pixelBlock.width + sourceX];
						}
					}
				}).catch(error => {
					console.error(error);
				});

				promises.push(promise);
			}
		}

		await Promise.allSettled(promises);

		return output;
	}

	private static async loadAndDecodeHeight(x: number, y: number, zoom: number): Promise<Lerc.LercData> {
		const localURL = `/streets/tiles/elevation/${zoom}/${y}/${x}.lerc`;
		const remoteURL = `https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer/tile/${zoom}/${y}/${x}`;
		let response: Response = null;
		try { response = await fetch(localURL); } catch {}
		if (!response?.ok) response = await fetch(remoteURL);

		if (response.status !== 200) {
			throw new Error(`Failed to load elevation tile ${zoom}/${y}/${x}`);
		}

		const arrayBuffer = await response.arrayBuffer();

		return Lerc.decode(arrayBuffer);
	}

	private static packHeightIntoRGB(height: number): [number, number, number] {
		const elevation = Math.round((height + 10000) / 0.1);

		const b = elevation % 256;
		const g = Math.floor(elevation / 256) % 256;
		const r = Math.floor(elevation / (256 * 256)) % 256;

		return [r, g, b];
	}
}
