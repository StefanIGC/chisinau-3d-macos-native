import {groundOwners} from './objects/GameGroundMask';
import RenderSystem from "./systems/RenderSystem";
import TileSystem from "./systems/TileSystem";
import ControlsSystem from "./systems/ControlsSystem";
import PickingSystem from "./systems/PickingSystem";
import CursorStyleSystem from './systems/CursorStyleSystem';
import SystemManager from "./SystemManager";
import TileObjectsSystem from "./systems/TileObjectsSystem";
import TileLoadingSystem from "./systems/TileLoadingSystem";
import MapWorkerSystem from "./systems/MapWorkerSystem";
import MapTimeSystem from "./systems/MapTimeSystem";
import UISystem from "./systems/UISystem";
import SceneSystem from './systems/SceneSystem';
import ResourceLoader, {ResourceJSON} from './world/ResourceLoader';
import resourcesList from '../resources/resources.json';
import VehicleSystem from "./systems/VehicleSystem";
import TerrainSystem from "./systems/TerrainSystem";
import SettingsSystem from "~/app/systems/SettingsSystem";
import SlippyMapSystem from "~/app/systems/SlippyMapSystem";
import {gameMode, gameRender, GameTile,preparationTiles} from './GameBridge';
import MathUtils from '~/lib/math/MathUtils';
import {getGameOcclusion} from './GameOcclusion';

class App {
	private loop = (deltaTime: number): void => this.update(deltaTime);
	private time = 0;
	private stopped = false;
	private rendererReady = false;
	private readyReported = false;
	private hostStatus = 'loading';
	private hostProgress = 0;
	private systemManager: SystemManager;

	public constructor() {
		if (gameMode) {
            document.documentElement.dataset.game = 'true';
            const app = this;
            const refreshInstances=(treesOnly=false)=>{
                const sceneSystem=app.systemManager.getSystem(SceneSystem);
                const objects=sceneSystem.objects.instancedObjects;
                for(const tile of app.systemManager.getSystem(TileSystem).tiles.values()){
                    if(!tile.disposed&&(treesOnly?tile.applyGameTrees():tile.applyGameInstances()))tile.updateInstancesBoundingBoxes(objects);
                }
                sceneSystem.invalidateInstancedObjectsBuffers();
            };
            window.streetsGame = {
                get ready() { return app.rendererReady && !app.stopped; },
                render(frame) {
                    if (!this.ready) return;
                    gameRender.sunDirection=frame.sunDirection;
                    gameRender.distance=Math.max(200,Math.min(1800,frame.distance||1500));
                    gameRender.scale=Math.max(.45,Math.min(1.2,frame.scale||1));
                    gameRender.visible=frame.visible!==false;
                    gameRender.streamFocus=frame.streamFocus??[frame.position[0],frame.position[2]];
                    gameRender.streamVelocity=frame.streamVelocity??[0,0];
                    gameRender.prepareRadius=frame.prepareRadius??0;
                    app.systemManager.getSystem(ControlsSystem).applyGameCamera({...frame,distance:gameRender.distance});
                    app.update(performance.now(), true);
                },
                height(x, z) {
                    if (!this.ready) return null;
                    return app.systemManager.getSystem(TerrainSystem).terrainHeightProvider.getHeightGlobalInterpolated(x, z, true);
                },
                occlusion() {
                    return this.ready?getGameOcclusion(app.systemManager.getSystem(SceneSystem)):null;
                },
                tiles(x, z, radius) {
                    if (!this.ready) return [];
                    const result: GameTile[] = [];
                    for (const [key, tile] of app.systemManager.getSystem(TileSystem).tiles) {
                        if (tile.disposed || !tile.extrudedMesh || Math.hypot(tile.position.x - x, tile.position.z - z) > radius + 865) continue;
                        result.push({id: `${key}:${tile.localId}:${tile.extrudedMesh.gameRevision}`, x: tile.position.x, z: tile.position.z, positions: tile.extrudedMesh.gamePositions, parts: tile.extrudedMesh.gameParts});
                    }
                    return result;
                },
                replaceGround(items) {groundOwners.items=items;groundOwners.revision++;refreshInstances();},
                replaceBuildings(items) {
                    gameRender.replacements=items;
                    gameRender.revision++;
                    refreshInstances();
                },
                replaceTrees(items) {
                    gameRender.treeOverrides=items;
                    refreshInstances(true);
                },
                replaceInstances(items) {
                    gameRender.instanceOverrides=items;
                    refreshInstances();
                },
                areaReady(x,z,radius){
                    if(!this.ready)return false;
                    const tiles=app.systemManager.getSystem(TileSystem);
                    return preparationTiles([x,z],radius).every(([tx,ty])=>{
                        const tile=tiles.getTile(tx,ty);
                        return !!tile?.extrudedMesh&&!!tile.projectedMesh&&tile.gameLoadComplete&&!tile.disposed;
                    });
                },
                hasTile(x, z) {
                    if (!this.ready) return false;
                    const location = MathUtils.meters2tile(x, z, 16);
                    const tile=app.systemManager.getSystem(TileSystem).getTile(Math.floor(location.x),Math.floor(location.y));
                    return !!tile?.extrudedMesh && tile.gameLoadComplete && !tile.disposed;
                },
                tileId(x,z){
                    if(!this.ready)return null;
                    const location=MathUtils.meters2tile(x,z,16),key=`${Math.floor(location.x)},${Math.floor(location.y)}`;
                    const tile=app.systemManager.getSystem(TileSystem).tiles.get(key);
                    return tile?.extrudedMesh&&tile.gameLoadComplete&&!tile.disposed?`${key}:${tile.localId}:${tile.extrudedMesh.gameRevision}`:null;
                }
            };
        }
		window.addEventListener('message', (event: MessageEvent) => {
			if (event.origin === window.location.origin && event.source === window.parent && event.data?.type === 'streets-request-status') {
				this.report(this.hostStatus, this.hostProgress);
			}
		});
		this.init();
	}

	private report(status: string, progress?: number): void {
        if (this.stopped && status === 'loading') return;
        this.hostStatus = status;
        this.hostProgress = progress ?? this.hostProgress;
        document.documentElement.dataset.streetsStatus = status;
        window.parent.postMessage({type: 'streets-status', status, progress}, window.location.origin);
    }

    private fail(error: unknown): void {
        this.stopped = true;
        console.error('Streets GL initialization/rendering failed', error);
        this.report('error');
    }

    private init(): void {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const context = canvas.getContext('webgl2', {powerPreference: 'high-performance'});
        if (!context) {
            this.stopped = true;
            this.report('unsupported');
            return;
        }
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            this.fail(new Error('WebGL context lost'));
        });
        this.report('loading', 0);
		this.systemManager = new SystemManager();

		this.systemManager.addSystems(SettingsSystem);
		this.systemManager.addSystems(UISystem);

		ResourceLoader.addFromJSON(resourcesList as ResourceJSON);
		ResourceLoader.load({
			onFileLoad: (loaded: number, total: number) => {
				this.systemManager.getSystem(UISystem).setResourcesLoadingProgress(loaded / total);
				this.report('loading', loaded / total);
			},
			onLoadedFileNameChange: (name: string) => {
				this.systemManager.getSystem(UISystem).setResourceInProgressPath(name);
			}
		}).then(() => {
			this.systemManager.addSystems(
				ControlsSystem,
				MapTimeSystem,
				TerrainSystem,
				TileSystem,
				SceneSystem,
				CursorStyleSystem,
				PickingSystem,
				TileObjectsSystem,
				SlippyMapSystem,
				VehicleSystem,
				RenderSystem,
				MapWorkerSystem,
				TileLoadingSystem,
			);
			this.rendererReady = true;
		}).catch(error => this.fail(error));

		this.update();
	}

	private update(rafTime = 0, fromGame = false): void {
		if (this.stopped) return;
		if (gameMode && this.rendererReady && this.readyReported && !fromGame) return;

		const frameStart = performance.now();
		const deltaTime = (rafTime - this.time) / 1e3;
		this.time = rafTime;

        try {
            this.systemManager.updateSystems(Math.min(deltaTime, 0.1));
            if (this.rendererReady && !this.readyReported) {
                this.readyReported = true;
                this.report('ready', 1);
            }
        } catch (error) {
            this.fail(error);
            return;
        }
        if (!gameMode || !this.rendererReady) requestAnimationFrame(this.loop);

		const frameTime = performance.now() - frameStart;
		this.systemManager.getSystem(UISystem).updateFrameTime(frameTime);
	}
}

export default new App;
