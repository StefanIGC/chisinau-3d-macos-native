import * as T from 'three';

/** World-space detail remains fixed when either renderer's camera moves. */
export function parkMaterial(kind:'stone'|'slab'|'paver'|'asphalt'|'grass'|'flowers'|'water'|'ground',color='#999d97',vertexColors=true){
  const material=new T.MeshStandardMaterial({name:`Parcul Catedralei · ${kind}`,color:vertexColors?'#ffffff':color,vertexColors,roughness:kind==='water'?.28:.93,metalness:kind==='water'?.08:0});
  const time={value:0};material.userData.parkTime=time;
  material.customProgramCacheKey=()=>`cathedral-park-v49-${kind}`;
  material.onBeforeCompile=s=>{
    if(kind==='ground')s.vertexShader='attribute float parkStyle;\nvarying float parkStyleV;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nparkStyleV=parkStyle;');
    s.vertexShader='varying vec3 parkPosition;\nvarying float parkUp;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      parkPosition=(modelMatrix*vec4(transformed,1.)).xyz;
      parkUp=abs(normalize(mat3(modelMatrix)*normal).y);`);
    let detail='';
    if(kind==='slab'||kind==='paver'||kind==='ground')detail+=`
      if(parkUp>.55${kind==='ground'?'&&parkStyleV>.5&&parkStyleV<2.5':''}){
        vec2 q=parkPosition.xz/${kind==='ground'?'(parkStyleV<1.5?vec2(.6,.6):vec2(.24,.12))':kind==='slab'?'vec2(.6,.6)':'vec2(.24,.12)'};
        ${kind==='ground'?'if(parkStyleV>1.5)q.x+=mod(floor(q.y),2.)*.5;':kind==='paver'?'q.x+=mod(floor(q.y),2.)*.5;':''}
        vec2 f=fract(q),aa=fwidth(q);
        vec2 line=smoothstep(vec2(.011)-aa,vec2(.011)+aa,min(f,1.-f));
        float tile=fract(sin(dot(floor(q),vec2(127.1,311.7)))*43758.5453);
        float fade=1.-smoothstep(.3,1.,max(aa.x,aa.y));
        diffuseColor.rgb*=mix(1.,mix(.67,1.,min(line.x,line.y))*(.955+tile*.085),fade);
      }`;
    if(kind==='asphalt'||kind==='stone'||kind==='ground')detail+=`${kind==='ground'?'if(parkStyleV<.5||(parkStyleV>2.5&&parkStyleV<3.5))':''}{
      vec2 q=parkPosition.xz*25.;
      float fade=1.-smoothstep(.25,.9,max(fwidth(q.x),fwidth(q.y)));
      diffuseColor.rgb*=1.+(fract(sin(dot(floor(q),vec2(12.9898,78.233)))*43758.5453)-.5)*.055*fade;
    }`;
    if(kind==='grass'||kind==='ground')detail+=`${kind==='ground'?'if(parkStyleV>3.5&&parkStyleV<4.5)':''}{
      float soft=sin(parkPosition.x*.43+sin(parkPosition.z*.27))*sin(parkPosition.z*.35);
      float grain=fract(sin(dot(floor(parkPosition.xz*12.),vec2(12.9898,78.233)))*43758.5453);
      float fade=1.-smoothstep(.25,.9,max(fwidth(parkPosition.x*12.),fwidth(parkPosition.z*12.)));
      diffuseColor.rgb*=.9975+soft*.085+(grain-.5)*.055*fade;}`;
    if(kind==='flowers'||kind==='ground')detail+=`${kind==='ground'?'if(parkStyleV>4.5&&parkStyleV<5.5)':''}{
      vec2 p=parkPosition.xz-vec2(24.,-15.);
      float r=length(p),angle=atan(p.x,-p.y);
      float petal=abs(sin(angle*12.+sin(r*.27)*.2));
      float fleck=fract(sin(dot(floor(parkPosition.xz*9.),vec2(12.9898,78.233)))*43758.5453);
      if(parkPosition.z>-80.&&r<64.)diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.52,.52,.40),1.-smoothstep(.07,.19,petal));
      float fade=1.-smoothstep(.25,.9,max(fwidth(parkPosition.x*9.),fwidth(parkPosition.z*9.)));
      diffuseColor.rgb*=.94+(fleck-.5)*.28*fade;}`;
    if(kind==='water'){s.uniforms.parkTime=time;detail=`diffuseColor.rgb*=.93+.07*sin(parkPosition.x*18.+parkPosition.y*25.+sin(parkPosition.z*10.)-parkTime*3.);`;s.fragmentShader='uniform float parkTime;\n'+s.fragmentShader;}
    s.fragmentShader='varying vec3 parkPosition;\nvarying float parkUp;\n'+s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+detail);
    if(kind==='ground')s.fragmentShader='varying float parkStyleV;\n'+s.fragmentShader;
  };
  return material;
}
