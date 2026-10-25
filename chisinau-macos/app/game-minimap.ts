import {localToGeo,localBearing} from './streets-coordinates';

export function createGameMinimap(canvas:HTMLCanvasElement) {
  const ctx=canvas.getContext('2d')!;
  const tiles=new Map<string,{image:HTMLImageElement;ready:boolean;used:number}>();
  let disposed=false,tick=0;
  const zoom=17,size=256*2**zoom;
  function pixels(x:number,z:number){const p=localToGeo(x,z);return{x:(p.lon+180)/360*size,y:(1-Math.asinh(Math.tan(p.lat*Math.PI/180))/Math.PI)/2*size};}
  function draw(x:number,z:number,yaw:number,car?:{x:number;z:number},helicopter?:{x:number;z:number}) {
    const center=pixels(x,z),w=canvas.width,h=canvas.height;tick++;
    ctx.fillStyle='#33433f';ctx.fillRect(0,0,w,h);
    const left=center.x-w/2,top=center.y-h/2,count=2**zoom;
    for(let ty=Math.floor(top/256);ty<=Math.floor((top+h)/256);ty++)for(let tx=Math.floor(left/256);tx<=Math.floor((left+w)/256);tx++){
      if(ty<0||ty>=count)continue;const wrapped=((tx%count)+count)%count,key=`${wrapped}/${ty}`;
      let tile=tiles.get(key);
      if(!tile){const image=new Image();tile={image,ready:false,used:tick};const item=tile;image.onload=()=>{if(!disposed)item.ready=true;};image.src=`https://tile.openstreetmap.org/${zoom}/${wrapped}/${ty}.png`;tiles.set(key,tile);}
      tile.used=tick;if(tile.ready)ctx.drawImage(tile.image,tx*256-left,ty*256-top,256,256);
    }
    for(const[key,tile]of tiles)if(tick-tile.used>100){tile.image.onload=null;tiles.delete(key);}
    if(car){const point=pixels(car.x,car.z);ctx.fillStyle='#162f40';ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.arc(point.x-left,point.y-top,7,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(helicopter){const point=pixels(helicopter.x,helicopter.z);ctx.fillStyle='#e9c782';ctx.strokeStyle='#22353d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(point.x-left,point.y-top,12,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#22353d';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillText('H',point.x-left,point.y-top+5);}
    // Player stays centered; geographical bearing is shared with the 3D camera.
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(localBearing(yaw));
    ctx.fillStyle='#1477da33';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,50,-Math.PI*.72,-Math.PI*.28);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1976d2';ctx.strokeStyle='white';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(10,12);ctx.lineTo(0,7);ctx.lineTo(-10,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.font='bold 22px Arial';ctx.textAlign='right';ctx.fillStyle='#18343f';ctx.fillText('N ↑',w-15,29);
    const geo=localToGeo(x,z);canvas.setAttribute('aria-label',`Poziția ta: ${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)}. Nordul este în sus.`);
  }
  return{draw,dispose(){disposed=true;for(const tile of tiles.values())tile.image.onload=null;tiles.clear();}};
}
