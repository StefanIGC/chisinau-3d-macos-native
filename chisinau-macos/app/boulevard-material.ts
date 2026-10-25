import * as T from 'three';
/** Opaque, world-anchored surfaces. High-frequency detail fades before aliasing. */
export function boulevardMaterial(){
 const material=new T.MeshStandardMaterial({name:'Ștefan cel Mare · suprafețe',vertexColors:true,roughness:.94});
 material.customProgramCacheKey=()=> 'boulevard-v38';
 material.onBeforeCompile=s=>{
  s.vertexShader='attribute float parkStyle;varying float boulevardStyle;varying vec3 boulevardPoint;varying float boulevardUp;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    boulevardStyle=parkStyle;boulevardPoint=(modelMatrix*vec4(transformed,1.)).xyz;boulevardUp=abs(normalize(mat3(modelMatrix)*normal).y);`);
  s.fragmentShader='varying float boulevardStyle;varying vec3 boulevardPoint;varying float boulevardUp;\n'+s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 p=boulevardPoint.xz;
    if(boulevardUp>.6&&(boulevardStyle<2.5&&boulevardStyle>.5||boulevardStyle>6.5&&boulevardStyle<8.5)){
      vec2 pitch=boulevardStyle<1.5?vec2(.6,.6):vec2(.3,.15);
      vec2 q=p/pitch;if(boulevardStyle>1.5)q.x+=mod(floor(q.y),2.)*.5;
      vec2 aa=fwidth(q),f=fract(q),joint=smoothstep(vec2(.009)-aa,vec2(.009)+aa,min(f,1.-f));
      float nearDetail=1.-smoothstep(.35,1.1,max(aa.x,aa.y));
      float variation=fract(sin(dot(floor(q),vec2(127.1,311.7)))*43758.5453);
      diffuseColor.rgb*=mix(1.,mix(.70,1.,min(joint.x,joint.y))*(.96+variation*.08),nearDetail);
    }
    if(boulevardStyle>2.5&&boulevardStyle<3.5){
      vec2 q=p*18.;float fade=1.-smoothstep(.25,.9,max(fwidth(q.x),fwidth(q.y)));
      float noise=fract(sin(dot(floor(q),vec2(12.9898,78.233)))*43758.5453);
      diffuseColor.rgb*=1.+(noise-.5)*.10*fade;
    }
    if(boulevardStyle>3.5&&boulevardStyle<4.5)diffuseColor.rgb*=.98+.055*sin(p.x*.31+sin(p.y*.2))*sin(p.y*.35);
    if(boulevardStyle>7.5&&boulevardStyle<8.5&&boulevardUp>.6){
      vec2 q=p/.06,aa=fwidth(q);float line=smoothstep(.12-aa.x,.12+aa.x,abs(fract(q.x)-.5));
      diffuseColor.rgb*=mix(1.,.80+.20*line,1.-smoothstep(.4,1.,max(aa.x,aa.y)));
    }
  `);
 };
 return material;
}
