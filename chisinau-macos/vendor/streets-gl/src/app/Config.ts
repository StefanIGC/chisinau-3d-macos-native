import {SettingsSchema, SettingsSchemaRangeScale} from "~/app/settings/SettingsSchema";
import {gameMode} from './GameBridge';

const Config = {
	TileSize: /*40075016.68 / (1 << 16)*/ 611.4962158203125,
	// Workers have no window: their gameMode is false. Match the finest game
	// terrain grid in both contexts so the ground cannot cut through roads.
	TerrainProjectionSegments: 32,
	MaxConcurrentTiles: gameMode ? 20 : 150,
	MaxTilesPerWorker: 1,
	WorkersCount: Math.max(1, Math.min(gameMode ? 2 : 4, navigator.hardwareConcurrency || 2)),
	StartPosition: {lat: 47.02843, lon: 28.82546, pitch: 45, yaw: 0, distance: 1206.19},
	MinCameraDistance: 10,
	MaxCameraDistance: 4000,
	SlippyMapTransitionDuration: 400,
	MinFreeCameraHeight: 10,
	CameraZoomSmoothing: 0.4,
	CameraZoomSpeed: 0.0005,
	CameraZoomTrackpadFactor: 4,
	MinCameraPitch: 5,
	MaxCameraPitch: 89.99,
	MinFreeCameraPitch: -89.99,
	MaxFreeCameraPitch: 89.99,
	GroundCameraSpeed: 400,
	GroundCameraSpeedFast: 1200,
	FreeCameraSpeed: 400,
	FreeCameraSpeedFast: 1200,
	FreeCameraRotationSensitivity: 0.00002,
	FreeCameraYawSpeed: 0.8,
	FreeCameraPitchSpeed: 0.8,
	MinTexturedRoofArea: 50,
	MaxTexturedRoofAABBArea: 2e6,
	BuildingSmoothNormalsThreshold: 30,
	LightTransitionDuration: 1,
	OverpassRequestTimeout: 30000,
	CameraFOVZoomFactor: 2,
	CSMShadowCameraNear: 1,
	CSMShadowCameraFar: 20000,
	TerrainRingCount: gameMode ? 3 : 6,
	TerrainRingSegmentCount: gameMode ? 32 : 64,
	TerrainRingSizeZoom: gameMode ? 15 : 13,
	TerrainRingSize: 40075016.68 / (1 << (gameMode ? 15 : 13)),
	TerrainMaskResolution: 32,
	TerrainNormalMixRange: [10000, 14500],
	TerrainUsageTextureSize: 512,
	TerrainUsageTexturePadding: 3,
	TerrainUsageSDFPasses: 3,
	TerrainDetailUVScale: 64,
	SlippyMapMinZoom: 0,
	SlippyMapMaxZoom: 16,
	SlippyMapZoomFactor: 0.001,
	SlippyMapFetchBatchSize: 4,
	SettingsSchema: {
		fov: {
			label: 'Vertical field of view',
			selectRange: [5, 120, 1],
			selectRangeDefault: 40,
			category: 'general'
		},
		labels: {
			label: 'Text labels',
			status: ['off', 'on'],
			statusLabels: ['Disabled', 'Enabled'],
			statusDefault: 'on',
			category: 'general'
		},
		terrainHeight: {
			label: 'Use terrain elevation data',
			status: ['off', 'on'],
			statusLabels: ['Disabled', 'Enabled'],
			statusDefault: 'on',
			category: 'general'
		},
		/*airTraffic: {
			label: 'Real-time air traffic',
			status: ['off', 'on'],
			statusLabels: ['Disabled', 'Enabled'],
			statusDefault: 'on',
			category: 'general'
		},*/
		shadows: {
			label: 'Shadows',
			status: ['off', 'low', 'medium', 'high'],
			statusLabels: ['Disabled', 'Low', 'Medium', 'High'],
			statusDefault: 'medium',
			category: 'graphics'
		},
		taa: {
			label: 'TAA',
			status: ['off', 'on'],
			statusLabels: ['Disabled', 'Enabled'],
			statusDefault: 'on',
			category: 'graphics'
		},
		dof: {
			label: 'Depth of field',
			status: ['off', 'low', 'high'],
			statusLabels: ['Disabled', 'Low quality', 'High quality'],
			statusDefault: 'off',
			category: 'graphics'
		},
		dofAperture: {
			label: 'Aperture',
			parent: 'dof',
			parentStatusCondition: ['low', 'high'],
			selectRange: [0.001, 1, 0.001],
			selectRangeDefault: 0.01,
			selectRangeScale: SettingsSchemaRangeScale.Logarithmic,
			category: 'graphics'
		},
		dofMode: {
			label: 'Focusing mode',
			parent: 'dof',
			parentStatusCondition: ['low', 'high'],
			status: ['center', 'cursor'],
			statusLabels: ['Screen center', 'Cursor position'],
			statusDefault: 'center',
			category: 'graphics'
		},
		bloom: {
			label: 'Bloom',
			status: ['off', 'on'],
			statusLabels: ['Disabled', 'Enabled'],
			statusDefault: 'on',
			category: 'graphics'
		},
		ssr: {
			label: 'Screen-space reflections',
			status: ['off', 'low', 'high'],
			statusLabels: ['Disabled', 'Low quality', 'High quality'],
			statusDefault: 'off',
			category: 'graphics'
		},
		ssao: {
			label: 'Screen-space ambient occlusion',
			status: ['off', 'on'],
			statusLabels: ['Disabled', 'Enabled'],
			statusDefault: 'on',
			category: 'graphics'
		}
	} as SettingsSchema,
	OverpassEndpoints: [
		{url: 'https://overpass-api.de/api/interpreter', isEnabled: true},
		{url: 'https://overpass.openstreetmap.ru/cgi/interpreter', isEnabled: false},
		{url: 'https://overpass.kumi.systems/api/interpreter', isEnabled: false}
	],
	TileServerEndpoint: 'https://tiles.streets.gl',
	SlippyEndpointTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
	TilesEndpointTemplate: 'https://tiles.streets.gl/vector/{z}/{x}/{y}'
};

export default Config;
