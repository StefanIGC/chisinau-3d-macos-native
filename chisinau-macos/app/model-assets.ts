import assets from '../data/model-assets.json';

const byUrl=new Map(assets.map(asset=>[asset.url,asset]));

/** Immutable asset URLs make the existing CDN/browser cache the model store. */
export function modelAssetUrl(url:string){
  const asset=byUrl.get(url);
  if(!asset)throw Error(`Unindexed 3D model: ${url}`);
  return `${url}?v=${asset.sha256.slice(0,16)}`;
}

export const modelAssets=assets;
