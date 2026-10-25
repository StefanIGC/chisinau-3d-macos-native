import * as T from 'three';
import {parkMaterial} from './park-materials';

/** Preserve the central landmarks' established finishes on the imported geometry. */
export function finishMapLandmark(model:T.Group,title:string){
  if(title==='Scuarul Catedralei'){
    // Its existing steps and curved parapets stay intact; only their finish changes.
    const material=parkMaterial('slab','#989e99',false);
    model.traverse(o=>{if(o instanceof T.Mesh)o.material=material;});
    return;
  }
  // These photo palettes are baked into vertex colours. Their brightest stone
  // still reads as stark white in the game lighting beside the authored blocks.
  // A small material multiplier preserves every window/roof colour boundary.
  if(model.userData.mapMdPhotoColors){
    const tint:Record<string,string>={
      'Poșta Moldovei':'#eae6dc',
      'Președinția Republicii Moldova':'#eee9df',
      'Parlamentul Republicii Moldova':'#ece9e1',
      'Sala cu Orgă':'#eeeae2'
    };
    if(tint[title]){
      const seen=new Set<T.Material>(),color=new T.Color(tint[title]);
      model.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(seen.has(m))continue;seen.add(m);
        if(m instanceof T.MeshStandardMaterial)m.color.multiply(color);
      }});
    }
    return;
  }
  if(!['Catedrala Nașterea Domnului','Clopotnița Catedralei','Ștefan cel Mare'].includes(title))return;
  model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  const point=new T.Vector3(),normal=new T.Vector3();
  model.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    const material=(Array.isArray(object.material)?object.material[0]:object.material).clone() as T.MeshStandardMaterial;
    object.material=material;
    if(title==='Clopotnița Catedralei'){
      if(material.name.includes('Untitled_7'))material.color.set('#526c67');
      else if(material.name.includes('Untitled_9')){material.color.set('#b79b53');material.metalness=.5;}
      else if(material.name.includes('initialShadingGroup'))material.color.set('#725d43');
      else if(material.name.includes('_t1'))material.color.set('#554333');
      return;
    }
    // Vertex colours keep the original topology and draw count. Original source
    // materials are uniform limestone and contain no colour textures.
    const geometry=object.geometry.clone(),position=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
    const colors=new Float32Array(position.count*3),stone=new T.Color('#d5ceba'),roof=new T.Color('#526c67'),bronze=new T.Color('#515848'),gold=new T.Color('#b79b53');
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld);const h=(point.y-bounds.min.y)/height;
      normal.fromBufferAttribute(normals,i).transformDirection(object.matrixWorld);
      const color=title==='Ștefan cel Mare'?(h>.49?bronze:stone):h>.965?gold:h>.62||(h>.30&&h<.48&&normal.y>.35)?roof:stone;
      color.toArray(colors,i*3);
    }
    geometry.setAttribute('color',new T.BufferAttribute(colors,3));object.geometry=geometry;
    material.color.set('#ffffff');material.vertexColors=true;material.needsUpdate=true;
  });
}
