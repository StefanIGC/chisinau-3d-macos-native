import * as T from 'three';

type Node={box:T.Box3;start:number;end:number;left:number;right:number};
type BakedCollision={version:1;first:number;triangles:number;vertices:number;order:number[];nodes:number[][]};

/** Static, double-sided building collisions. Preparation yields every 256 items,
 * so a large imported model cannot monopolize the animation frame. No triangles
 * are simplified: doors, stairs and walkable roofs retain their original shape. */
export function* prepareLandmarkCollision(root:T.Object3D,onPrepared?:(mesh:T.Mesh,data:BakedCollision)=>void):Generator<void>{
  const meshes:T.Mesh[]=[];
  root.traverse(object=>{if(object instanceof T.Mesh)meshes.push(object);});
  for(const mesh of meshes){
    const geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index;
    const first=Math.ceil(geometry.drawRange.start/3),last=Math.floor(Math.min(index?.count??position.count,geometry.drawRange.start+geometry.drawRange.count)/3);
    const count=last-first;if(!count)continue;
    const stored=geometry.userData.landmarkCollision as BakedCollision|undefined;
    const baked=stored?.version===1&&stored.first===first&&stored.triangles===count&&stored.vertices===position.count&&stored.order.length===count&&stored.nodes.length?stored:undefined;
    const order=baked?.order??new Uint32Array(count),bounds=baked?undefined:new Float32Array(count*6),nodes:Node[]=[];
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let work=0;
    if(!baked){
    const triangleBounds=bounds!;
    for(let i=0;i<count;i++){
      const face=first+i,at=face*3;
      a.fromBufferAttribute(position,index?index.getX(at):at);
      b.fromBufferAttribute(position,index?index.getX(at+1):at+1);
      c.fromBufferAttribute(position,index?index.getX(at+2):at+2);
      order[i]=i;const j=i*6;
      triangleBounds[j]=Math.min(a.x,b.x,c.x);triangleBounds[j+1]=Math.min(a.y,b.y,c.y);triangleBounds[j+2]=Math.min(a.z,b.z,c.z);
      triangleBounds[j+3]=Math.max(a.x,b.x,c.x);triangleBounds[j+4]=Math.max(a.y,b.y,c.y);triangleBounds[j+5]=Math.max(a.z,b.z,c.z);
      if(++work%256===0)yield;
    }
    const pending=[{start:0,end:count,parent:-1,right:false}];
    while(pending.length){
      const task=pending.pop()!,box=new T.Box3(),node:Node={box,start:task.start,end:task.end,left:-1,right:-1};
      const id=nodes.length;nodes.push(node);
      if(task.parent>=0)nodes[task.parent][task.right?'right':'left']=id;
      for(let i=node.start;i<node.end;i++){
        const j=order[i]*6;
        box.min.min(a.fromArray(triangleBounds,j));box.max.max(a.fromArray(triangleBounds,j+3));
        if(++work%256===0)yield;
      }
      if(node.end-node.start<=16)continue;
      const size=box.getSize(a),axis=size.x>=size.y&&size.x>=size.z?0:size.y>=size.z?1:2;
      const middle=(box.min.getComponent(axis)+box.max.getComponent(axis))/2;
      let split=node.start;
      for(let i=node.start;i<node.end;i++){
        const j=order[i]*6;
        if((triangleBounds[j+axis]+triangleBounds[j+axis+3])/2<middle){const temp=order[split];order[split++]=order[i];order[i]=temp;}
        if(++work%256===0)yield;
      }
      // Coincident centroids still get finite, balanced leaves.
      if(split===node.start||split===node.end)split=(node.start+node.end)>>>1;
      pending.push({start:split,end:node.end,parent:id,right:true},{start:node.start,end:split,parent:id,right:false});
    }
    }
    if(onPrepared)onPrepared(mesh,baked??{version:1,first,triangles:count,vertices:position.count,order:Array.from(order),nodes:nodes.map(n=>[...n.box.min.toArray(),...n.box.max.toArray(),n.start,n.end,n.left,n.right])});
    // Prebaked nodes are used directly. No per-triangle scan, sorting or thousands
    // of Box3 allocations stand between downloaded geometry and visibility.
    const nodeProbe:Node={box:new T.Box3(),start:0,end:0,left:-1,right:-1};
    const readNode=(id:number)=>{
      if(!baked)return nodes[id];
      const r=baked.nodes[id];nodeProbe.box.min.fromArray(r);nodeProbe.box.max.fromArray(r,3);
      nodeProbe.start=r[6];nodeProbe.end=r[7];nodeProbe.left=r[8];nodeProbe.right=r[9];return nodeProbe;
    };
    geometry.boundingBox=readNode(0).box.clone();
    const ray=new T.Ray(),inverse=new T.Matrix4(),point=new T.Vector3(),worldPoint=new T.Vector3(),normal=new T.Vector3();
    const stack:number[]=[];
    mesh.raycast=function(raycaster,hits){
      inverse.copy(mesh.matrixWorld).invert();ray.copy(raycaster.ray).applyMatrix4(inverse);
      stack.length=0;stack.push(0);
      while(stack.length){
        const node=readNode(stack.pop()!);
        // Clip to the finite movement segment, not the infinite ray. Most
        // nearby facade detail lies beyond the player's short collision probe.
        if(!ray.intersectBox(node.box,point)&&!node.box.containsPoint(ray.origin))continue;
        if(!node.box.containsPoint(ray.origin)&&worldPoint.copy(point).applyMatrix4(mesh.matrixWorld).distanceToSquared(raycaster.ray.origin)>raycaster.far*raycaster.far)continue;
        if(node.left>=0){stack.push(node.left,node.right);continue;}
        for(let i=node.start;i<node.end;i++){
          const face=first+order[i],at=face*3,ia=index?index.getX(at):at,ib=index?index.getX(at+1):at+1,ic=index?index.getX(at+2):at+2;
          a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);
          if(!ray.intersectTriangle(a,b,c,false,point))continue;
          worldPoint.copy(point).applyMatrix4(mesh.matrixWorld);
          const distance=worldPoint.distanceTo(raycaster.ray.origin);
          if(distance<raycaster.near||distance>raycaster.far)continue;
          T.Triangle.getNormal(a,b,c,normal);
          hits.push({distance,point:worldPoint.clone(),object:mesh,faceIndex:face,face:{a:ia,b:ib,c:ic,normal:normal.clone(),materialIndex:0}});
        }
      }
    };
    yield;
  }
}
