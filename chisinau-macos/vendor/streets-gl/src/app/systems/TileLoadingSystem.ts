import System from "../System";
import MapWorkerSystem from "./MapWorkerSystem";
import Tile3DBuffers from "~/lib/tile-processing/tile3d/buffers/Tile3DBuffers";
import Config from "~/app/Config";
import MapWorker from "~/app/world/worker/MapWorker";
import TileSystem from "~/app/systems/TileSystem";
import Vec2 from "~/lib/math/Vec2";

export interface OverpassEndpoint {
	url: string;
	isEnabled: boolean;
	isUserDefined: boolean;
}

export default class TileLoadingSystem extends System {
	private readonly overpassEndpointsDefault: OverpassEndpoint[] = [];
	public overpassEndpoints: OverpassEndpoint[] = [];
	private readonly reservedWorkers = new Set<MapWorker>();
	private readonly completed: Array<() => void> = [];

	public constructor() {
		super();

		for (const {url, isEnabled} of Config.OverpassEndpoints) {
			const endpoint: OverpassEndpoint = {
				url: url,
				isEnabled: isEnabled,
				isUserDefined: false
			};

			this.overpassEndpointsDefault.push(endpoint);
		}

		try {
			const lsEndpoints = JSON.parse(localStorage.getItem('overpassEndpoints'));

			if (Array.isArray(lsEndpoints)) {
				for (const endpoint of lsEndpoints) {
					this.overpassEndpoints.push({
						url: String(endpoint.url),
						isEnabled: Boolean(endpoint.isEnabled),
						isUserDefined: Boolean(endpoint.isUserDefined),
					});
				}
			}
		} catch (e) {
			console.error(e);
		}

		for (const endpoint of this.overpassEndpointsDefault) {
			if (!this.overpassEndpoints.some(e => e.url === endpoint.url)) {
				this.overpassEndpoints.push(endpoint);
			}
		}
	}

	public postInit(): void {

	}

	public async fetchTilesTimestamp(): Promise<Date> {
		const url = `${Config.TileServerEndpoint}/vector.timestamp`;
		let timestamp: Date = null;

		try {
			const response = await fetch(url);

			if (response.status === 200) {
				const text = await response.text();
				timestamp = new Date(text.replace(/\n/g, ''));
			} else {
				console.error(`Failed to fetch vector tiles timestamp. Status: ${response.status}`);
			}
		} catch (e) {
			console.error(e);
		}

		return timestamp;
	}

	public setOverpassEndpoints(endpoints: OverpassEndpoint[]): void {
		this.overpassEndpoints = endpoints;
		localStorage.setItem('overpassEndpoints', JSON.stringify(endpoints));
	}

	public resetOverpassEndpoints(): void {
		this.overpassEndpoints = this.overpassEndpointsDefault;
	}

	private getNextOverpassEndpoint(): string {
		const urls = this.overpassEndpoints
			.filter(endpoint => endpoint.isEnabled)
			.map(endpoint => endpoint.url);

		if (urls.length === 0) {
			return null;
		}

		return urls[Math.floor(Math.random() * urls.length)];
	}

	public update(deltaTime: number): void {
		const mapWorkerSystem = this.systemManager.getSystem(MapWorkerSystem);
		const tileSystem = this.systemManager.getSystem(TileSystem);

		// Worker results can finish together. Commit at most one heavy tile on a
		// render frame so parsing/mesh creation cannot compound into a long pause.
		const completed=this.completed.shift();
		if(completed)completed();else tileSystem.loadDeferredGameTileStep();

		const worker = mapWorkerSystem.getFreeWorker(this.reservedWorkers);
		const overpassEndpoint = this.getNextOverpassEndpoint();
		if(!worker||!overpassEndpoint)return;
		const queuedTile = tileSystem.getNextTileToLoad();

		if (queuedTile && worker && overpassEndpoint) {
			this.reservedWorkers.add(worker);
			this.loadTile({
				tile: queuedTile.position,
				onBeforeLoad: queuedTile.onBeforeLoad,
				onLoad: queuedTile.onLoad,
				worker: worker,
				overpassEndpoint: overpassEndpoint,
				isTerrainHeightEnabled: tileSystem.enableTerrainHeight
			}).finally(()=>this.reservedWorkers.delete(worker));
		}
	}

	private async loadTile(
		{
			tile,
			onBeforeLoad,
			onLoad,
			worker,
			overpassEndpoint,
			isTerrainHeightEnabled
		}: {
			tile: Vec2;
			onBeforeLoad: () => Promise<any>;
			onLoad: (buffers: Tile3DBuffers) => void;
			worker: MapWorker;
			overpassEndpoint: string;
			isTerrainHeightEnabled: boolean;
		}
	): Promise<void> {
		try{
		await onBeforeLoad();
		const result=await worker.requestTile(tile.x, tile.y, {
			overpassEndpoint: overpassEndpoint,
			tileServerEndpoint: Config.TileServerEndpoint,
			vectorTilesEndpointTemplate: Config.TilesEndpointTemplate,
			isTerrainHeightEnabled: isTerrainHeightEnabled
		});
			this.completed.push(()=>onLoad(result));
		}catch(error){
			//console.error(`Failed to load tile ${tile.x},${tile.y}. Retrying...`, error);
			this.completed.push(()=>onLoad(null));
		}
	}
}
