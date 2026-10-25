type Entry<T>={value:T;minX:number;minZ:number;maxX:number;maxZ:number;stamp:number};
/** Allocation-free broad phase for the static map, camera and collision shapes. */
export class SpatialIndex<T>{
  private cells=new Map<string,Entry<T>[]>();
  private stamp=0;
  constructor(private size=48){}
  insert(value:T,minX:number,minZ:number,maxX:number,maxZ:number){
    const entry={value,minX,minZ,maxX,maxZ,stamp:0};
    for(let x=Math.floor(minX/this.size);x<=Math.floor(maxX/this.size);x++)for(let z=Math.floor(minZ/this.size);z<=Math.floor(maxZ/this.size);z++){
      const key=`${x}:${z}`,cell=this.cells.get(key);if(cell)cell.push(entry);else this.cells.set(key,[entry]);
    }
  }
  query(minX:number,minZ:number,maxX:number,maxZ:number,out:T[]){
    out.length=0;const stamp=++this.stamp;
    for(let x=Math.floor(minX/this.size);x<=Math.floor(maxX/this.size);x++)for(let z=Math.floor(minZ/this.size);z<=Math.floor(maxZ/this.size);z++){
      const cell=this.cells.get(`${x}:${z}`);if(!cell)continue;
      for(const entry of cell){if(entry.stamp===stamp)continue;entry.stamp=stamp;if(entry.minX>maxX||entry.maxX<minX||entry.minZ>maxZ||entry.maxZ<minZ)continue;out.push(entry.value);}
    }
    return out;
  }
}
