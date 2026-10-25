import RenderableObject3D from "./RenderableObject3D";
import AbstractMesh from "~/lib/renderer/abstract-renderer/AbstractMesh";
import AbstractRenderer from "~/lib/renderer/abstract-renderer/AbstractRenderer";
import {RendererTypes} from "~/lib/renderer/RendererTypes";
import Vec3 from "~/lib/math/Vec3";
import {Tile3DBuffersExtruded,Tile3DGamePart} from "~/lib/tile-processing/tile3d/buffers/Tile3DBuffers";

import Camera from '~/lib/core/Camera';
import {gameMode, gameRender} from '../GameBridge';
import {isBuildingReplaced} from './GameBuildingReplacement';

interface MeshDisplayBufferPatch {
	start: number;
	size: number;
	value: number;
}

export default class TileExtrudedMesh extends RenderableObject3D {
	public get gamePositions(): Float32Array { return this.buffers.positionBuffer; }
	private parts: Tile3DGamePart[] = [];
	private activeParts: Tile3DGamePart[] = [];
	private replacementRevision = -1;
	private partsKey = '';
	private geometryRevision = 0;
	public get gameRevision():number {void this.gameParts;return this.geometryRevision;}
	private visibleParts = '';
	public get gameParts(): Tile3DGamePart[] {
		if (this.replacementRevision !== gameRender.revision) {
			const x = this.parent?.position.x ?? 0, z = this.parent?.position.z ?? 0;
			this.activeParts = this.parts.filter(p => !isBuildingReplaced(p,this.buffers.positionBuffer,x,z,gameRender.replacements));
			this.replacementRevision = gameRender.revision;
			const key=this.activeParts.map(p=>p.start).join(',');
			if(key!==this.partsKey){this.partsKey=key;this.geometryRevision++;this.visibleParts='!';}
		}
		return this.activeParts;
	}

	/** Keep one draw per tile while submitting only buildings inside the view. */
	public selectForCamera(camera: Camera): void {
		if (!gameMode || !this.mesh || !camera.frustumPlanes) return;
		// Tile-level culling plus the short fog horizon are sufficient in game
		// mode. Keeping one stable index buffer avoids reallocating it whenever a
		// single building crosses a frustum plane during fast movement.
		const selected=this.gameParts;
		let count=0;for(const p of selected)count+=p.count;
		const key=selected.map(p=>p.start).join(',');
		if (key===this.visibleParts && this.mesh.indexed) return;
		this.visibleParts=key;
		const indices=new Uint32Array(count);let cursor=0;
		for(const p of selected) for(let j=p.start;j<p.start+p.count;j++) indices[cursor++]=j;
		this.mesh.setIndices(indices);
	}
	public mesh: AbstractMesh = null;
	private meshDisplayBufferPatches: MeshDisplayBufferPatch[] = [];

	public constructor(private buffers: Tile3DBuffersExtruded) {
		super();

		if (gameMode) {
			this.parts=buffers.gameParts??[];
		}
		const box = buffers.boundingBox;

		this.setBoundingBox(
			new Vec3(box.minX, box.minY, box.minZ),
			new Vec3(box.maxX, box.maxY, box.maxZ)
		);
	}

	public addDisplayBufferPatch(patch: MeshDisplayBufferPatch): void {
		this.meshDisplayBufferPatches.push(patch);
	}

	public isMeshReady(): boolean {
		return this.mesh !== null && this.meshDisplayBufferPatches.length === 0;
	}

	public updateMesh(renderer: AbstractRenderer): void {
		if (!this.mesh) {
			this.mesh = renderer.createMesh({
				attributes: [
					renderer.createAttribute({
						name: 'position',
						size: 3,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.buffers.positionBuffer
						})
					}),
					renderer.createAttribute({
						name: 'normal',
						size: 3,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.buffers.normalBuffer
						})
					}),
					renderer.createAttribute({
						name: 'color',
						size: 3,
						type: RendererTypes.AttributeType.UnsignedByte,
						format: RendererTypes.AttributeFormat.Float,
						normalized: true,
						buffer: renderer.createAttributeBuffer({
							data: this.buffers.colorBuffer
						})
					}),
					renderer.createAttribute({
						name: 'uv',
						size: 2,
						type: RendererTypes.AttributeType.Float32,
						format: RendererTypes.AttributeFormat.Float,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.buffers.uvBuffer
						})
					}),
					renderer.createAttribute({
						name: 'textureId',
						size: 1,
						type: RendererTypes.AttributeType.UnsignedByte,
						format: RendererTypes.AttributeFormat.Integer,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.buffers.textureIdBuffer
						})
					}),
					renderer.createAttribute({
						name: 'localId',
						size: 1,
						type: RendererTypes.AttributeType.UnsignedInt,
						format: RendererTypes.AttributeFormat.Integer,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: this.buffers.localIdBuffer
						})
					}),
					renderer.createAttribute({
						name: 'display',
						size: 1,
						type: RendererTypes.AttributeType.UnsignedByte,
						format: RendererTypes.AttributeFormat.Integer,
						normalized: false,
						buffer: renderer.createAttributeBuffer({
							data: new Uint8Array(this.buffers.localIdBuffer.length)
						})
					})
				]
			});
		}

		for (const {start, size, value} of this.meshDisplayBufferPatches) {
			const buffer = this.mesh.getAttribute('display').buffer;
			const data = buffer.data;

			for (let i = start; i < start + size; i++) {
				data[i] = value;
			}

			buffer.setData(data);
		}

		this.meshDisplayBufferPatches.length = 0;
	}

	public dispose(): void {
		if (this.mesh) {
			this.mesh.getAttribute('position').buffer.delete();
			this.mesh.getAttribute('normal').buffer.delete();
			this.mesh.getAttribute('color').buffer.delete();
			this.mesh.getAttribute('uv').buffer.delete();
			this.mesh.getAttribute('textureId').buffer.delete();
			this.mesh.getAttribute('localId').buffer.delete();
			this.mesh.getAttribute('display').buffer.delete();

			this.mesh.delete();
		}
	}
}
