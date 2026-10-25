import {load} from '@loaders.gl/core';
import {GLTFLoader} from '@loaders.gl/gltf';

export enum ResourceType {
	Image,
	GLTF
}

export type ResourceJSONTypes = "image" | "text";
export type ResourceJSON = Record<string, {url: string; type: ResourceJSONTypes}>

export interface ResourceRequest {
	url: string;
	type: ResourceType;
}

export default new class ResourceLoader {
	private resources: Map<string, any> = new Map();
	private requests: Map<string, ResourceRequest> = new Map();

	public add(name: string, url: string, type: ResourceType): void {
		this.requests.set(name, {url, type});
	}

	public addFromJSON(resources: ResourceJSON): void {
		for (const [name, record] of Object.entries(resources)) {
			const type = ResourceLoader.getResourceTypeFromString(record.type);

			if (name.startsWith('aircraft')) {
				// Skip aircraft models as they are unused for now
				continue;
			}

			this.add(name, record.url, type);
		}
	}

	public get(name: string): any {
		return this.resources.get(name);
	}

	public async load(
		{
			onFileLoad,
			onLoadedFileNameChange
		}: {
			onFileLoad: (loaded: number, total: number) => void;
			onLoadedFileNameChange: (name: string) => void;
		}
	): Promise<void> {
		let loaded = 0;
		const total = this.requests.size;

        const queue = [...this.requests.entries()];
        const worker = async (): Promise<void> => {
            while (queue.length) {
                const [name, request] = queue.shift();
                onLoadedFileNameChange(request.url);
                const promise = request.type === ResourceType.Image
                    ? this.loadImage(request.url) : this.loadGLTF(request.url);
                let timer: ReturnType<typeof setTimeout>;
                const timeout = new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error(`Resource timed out: ${request.url}`)), 30000);
                });
                const result = await Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
                this.resources.set(name, result);
                onFileLoad(++loaded, total);
            }
        };
        await Promise.all(Array.from({length: Math.min(6, total)}, worker));
        onLoadedFileNameChange('');
    }

    private async loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = (): void => resolve(image);
            image.onerror = (): void => reject(new Error(`Image failed: ${url}`));
            image.src = url;
        });
    }

	private async loadGLTF(url: string): Promise<HTMLImageElement> {
		return await load(url, GLTFLoader);
	}

	private static getResourceTypeFromString(str: string): ResourceType {
		switch (str) {
			case 'image':
				return ResourceType.Image;
			case 'gltf':
				return ResourceType.GLTF;
		}

		throw new Error(`Unknown resource type: ${str}`);
	}
};
