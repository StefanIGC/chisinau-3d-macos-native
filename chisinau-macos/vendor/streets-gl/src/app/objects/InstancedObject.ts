import RenderableObject3D from "~/app/objects/RenderableObject3D";
import AbstractMesh from "~/lib/renderer/abstract-renderer/AbstractMesh";
import AbstractRenderer from "~/lib/renderer/abstract-renderer/AbstractRenderer";
import {ModelSourceBuffers} from "~/app/objects/models/ModelManager";
import AABB3D from "~/lib/math/AABB3D";
import {InstanceStructureSchema} from "~/lib/tile-processing/tile3d/features/Tile3DInstance";
import AbstractAttributeBuffer from "~/lib/renderer/abstract-renderer/AbstractAttributeBuffer";
import {RendererTypes} from "~/lib/renderer/RendererTypes";

export default abstract class InstancedObject extends RenderableObject3D {
	protected abstract schema: InstanceStructureSchema;
	public mesh: AbstractMesh = null;
	protected instanceBuffers: ModelSourceBuffers;
	private interleavedBuffer: Float32Array = new Float32Array(1);
	protected interleavedAttributeBuffer: AbstractAttributeBuffer = null;
	public instanceCount: number = 0;
	private gameDepthBuffers: {positions:Float32Array;uv:Float32Array;indices:Uint32Array;instances:Float32Array;stride:number;x:number;z:number} = null;

	protected constructor(instanceBuffers: ModelSourceBuffers) {
		super();
		this.instanceBuffers = instanceBuffers;
	}

	public setInstancesInterleavedBuffer(interleavedBuffer: Float32Array): void {
		this.interleavedBuffer = interleavedBuffer;
		this.instanceCount = interleavedBuffer.length / this.schema.componentsPerInstance;

		if (this.mesh && this.interleavedAttributeBuffer) {
			this.interleavedAttributeBuffer.setData(this.interleavedBuffer);
			this.mesh.instanceCount = this.instanceCount;
		}
	}

	// Read after the native G-buffer pass: these are exactly its current visible
	// instances, including LOD selection and any tree replacements.
	public captureGameDepthBuffers(): void {
		this.gameDepthBuffers={positions:this.instanceBuffers.position,uv:this.instanceBuffers.uv,indices:this.instanceBuffers.indices,
			instances:this.interleavedBuffer,stride:this.schema.componentsPerInstance,x:this.position.x,z:this.position.z};
	}
	public clearGameDepthBuffers(): void { this.gameDepthBuffers=null; }
	public getGameDepthBuffers() { return this.gameDepthBuffers; }

	public isMeshReady(): boolean {
		return this.mesh !== null;
	}

	public updateMesh(renderer: AbstractRenderer): void {
		if (!this.mesh) {
			this.interleavedAttributeBuffer = renderer.createAttributeBuffer({
				data: this.interleavedBuffer,
				usage: RendererTypes.BufferUsage.DynamicDraw
			});

			this.mesh = this.createMesh(renderer);
		}
	}

	protected abstract createMesh(renderer: AbstractRenderer): AbstractMesh;

	public getInstancesAABB(interleavedBuffer: Float32Array): AABB3D {
		const modelBoundingBox = this.instanceBuffers.boundingBox;
		const totalBoundingBox = new AABB3D();

		for (let i = 0; i < interleavedBuffer.length; i += this.schema.componentsPerInstance) {
			const components: number[] = Array.from(
				interleavedBuffer.slice(i, i + this.schema.componentsPerInstance)
			);

			const transformed = this.schema.transformBoundingBox(modelBoundingBox, components);
			totalBoundingBox.includeAABB(transformed);
		}

		return totalBoundingBox;
	}
}
