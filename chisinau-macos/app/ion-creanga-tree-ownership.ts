/** Retire the native tree layer throughout rebuilt public space, not only at
 * the new trunk positions. Neighbouring unworked park/courtyard trees survive. */
const areas=[
 [[-2200,-225],[-1835,-225],[-1835,135],[-2200,135]],
 [[-2105,135],[-1990,135],[-1990,595],[-2095,595]],
];
export const ionCreangaTreeOwnership=areas.map(polygon=>{
 const x=polygon.reduce((v,p)=>v+p[0],0)/polygon.length,z=polygon.reduce((v,p)=>v+p[1],0)/polygon.length;
 return{x,z,radius:Math.max(...polygon.map(p=>Math.hypot(p[0]-x,p[1]-z)))+.01,height:0,texture:0,polygon};
});
