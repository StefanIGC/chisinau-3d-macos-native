#import <Cocoa/Cocoa.h>
#import <Metal/Metal.h>
#import <MetalKit/MetalKit.h>
#import <QuartzCore/QuartzCore.h>

#include <simd/simd.h>
#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <deque>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <mutex>
#include <numeric>
#include <sstream>
#include <string>
#include <vector>

using namespace simd;

static constexpr float kPi = 3.14159265358979323846f;
// The whole 6.6 km offline map remains inside the camera frustum. Detailed
// authored meshes still stream locally, while the lightweight base city stays
// visible all the way to the horizon without atmospheric fog.
static constexpr float kNoFogViewDistance = 7000.f;

struct PackedVertex {
  float px, py, pz;
  float nx, ny, nz;
  float r, g, b, a;
};
static_assert(sizeof(PackedVertex) == 40);

struct TileHeader {
  uint32_t magic, version;
  int32_t x, y;
  float centerX, centerZ;
  uint32_t vertexCount, collisionCount;
  uint32_t reserved[8];
};
static_assert(sizeof(TileHeader) == 64);

struct CollisionSegment { float ax,az,bx,bz,radius,height; };
static_assert(sizeof(CollisionSegment) == 24);

struct MeshHeader {
  uint32_t magic,version,vertexCount,reserved0;
  float min[3],max[3];
  uint32_t reserved[6];
};
static_assert(sizeof(MeshHeader)==64);

struct ModelMesh {
  id<MTLBuffer> buffer=nil;
  NSUInteger vertexCount=0;
  vector_float3 min{0,0,0},max{0,0,0};
};

struct Uniforms {
  matrix_float4x4 viewProjection;
  matrix_float4x4 model;
  vector_float4 cameraAndFogStart;
  vector_float4 fogEndAndSun;
  vector_float4 tintAndTime;
  vector_float4 viewportAndExposure;
};

struct SkyUniforms {
  vector_float4 cameraAndTime;
  vector_float4 viewAndAspect;
};

static matrix_float4x4 translation(float x, float y, float z) {
  matrix_float4x4 m = matrix_identity_float4x4;
  m.columns[3] = {x,y,z,1};
  return m;
}

static matrix_float4x4 scaleMatrix(float x, float y, float z) {
  matrix_float4x4 m = matrix_identity_float4x4;
  m.columns[0].x=x; m.columns[1].y=y; m.columns[2].z=z;
  return m;
}

static matrix_float4x4 rotationY(float angle) {
  float c=std::cos(angle),s=std::sin(angle);
  matrix_float4x4 m=matrix_identity_float4x4;
  m.columns[0]={c,0,-s,0}; m.columns[2]={s,0,c,0};
  return m;
}

static matrix_float4x4 rotationX(float angle) {
  float c=std::cos(angle),s=std::sin(angle);
  matrix_float4x4 m=matrix_identity_float4x4;
  m.columns[1]={0,c,s,0};m.columns[2]={0,-s,c,0};
  return m;
}

static matrix_float4x4 rotationZ(float angle) {
  float c=std::cos(angle),s=std::sin(angle);
  matrix_float4x4 m=matrix_identity_float4x4;
  m.columns[0]={c,s,0,0};m.columns[1]={-s,c,0,0};
  return m;
}

static float damp(float value,float target,float response,float dt) {
  return target+(value-target)*std::exp(-response*dt);
}

static float moveTowards(float value,float target,float amount) {
  if(value<target)return std::min(value+amount,target);
  return std::max(value-amount,target);
}

static matrix_float4x4 perspective(float fovy, float aspect, float nearPlane, float farPlane) {
  float ys=1/std::tan(fovy*.5f),xs=ys/aspect,zs=farPlane/(nearPlane-farPlane);
  matrix_float4x4 m{};
  m.columns[0]={xs,0,0,0};m.columns[1]={0,ys,0,0};
  m.columns[2]={0,0,zs,-1};m.columns[3]={0,0,zs*nearPlane,0};
  return m;
}

static matrix_float4x4 lookAt(vector_float3 eye, vector_float3 target) {
  vector_float3 z=simd_normalize(eye-target),x=simd_normalize(simd_cross((vector_float3){0,1,0},z)),y=simd_cross(z,x);
  matrix_float4x4 m;
  m.columns[0]={x.x,y.x,z.x,0};m.columns[1]={x.y,y.y,z.y,0};m.columns[2]={x.z,y.z,z.z,0};
  m.columns[3]={-simd_dot(x,eye),-simd_dot(y,eye),-simd_dot(z,eye),1};
  return m;
}

static NSString *const kShaderSource = @R"METAL(
#include <metal_stdlib>
using namespace metal;
struct PackedVertex { packed_float3 position; packed_float3 normal; packed_float4 color; };
struct Uniforms {
  float4x4 viewProjection;
  float4x4 model;
  float4 cameraAndFogStart;
  float4 fogEndAndSun;
  float4 tintAndTime;
  float4 viewportAndExposure;
};
struct Raster { float4 position [[position]]; float3 world; float3 normal; float4 color; };
vertex Raster cityVertex(device const PackedVertex *vertices [[buffer(0)]], constant Uniforms &u [[buffer(1)]], uint id [[vertex_id]]) {
  PackedVertex v=vertices[id];
  float4 world=u.model*float4(float3(v.position),1.0);
  Raster o;o.position=u.viewProjection*world;o.world=world.xyz;
  o.normal=normalize(float3(u.model*float4(float3(v.normal),0.0)));o.color=float4(v.color)*float4(u.tintAndTime.xyz,1.0);return o;
}
float3 acesFilmic(float3 color) {
  // The browser uses THREE.ACESFilmicToneMapping. These are the same fitted
  // ACES input/output matrices and the same 0.6 exposure normalization.
  color*=1.0/0.6;
  color=float3x3(
    float3(.59719,.07600,.02840),float3(.35458,.90834,.13383),float3(.04823,.01566,.83777)
  )*color;
  float3 a=color*(color+.0245786)-.000090537;
  float3 b=color*(.983729*color+.4329510)+.238081;
  color=a/b;
  color=float3x3(
    float3(1.60475,-.10208,-.00327),float3(-.53108,1.10813,-.07276),float3(-.07367,-.00605,1.07602)
  )*color;
  return saturate(color);
}
float hash21(float2 p){p=fract(p*float2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float valueNoise(float2 p){float2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+float2(1,0)),f.x),mix(hash21(i+float2(0,1)),hash21(i+1.0),f.x),f.y);}
float fbm(float2 p){float v=0.0,a=.5;for(int i=0;i<4;i++){v+=valueNoise(p)*a;p=p*2.03+float2(19.1,7.7);a*=.5;}return v;}
float3 materialDetail(float3 base,float3 world,float3 n,uint materialClass,float fade,texture2d<float> asphaltTexture,texture2d<float> pavementTexture,texture2d<float> grassTexture,sampler surfaceSampler){
  float3 original=base;
  if(materialClass==3){
    float3 texel=asphaltTexture.sample(surfaceSampler,world.xz/4.5).rgb;
    float textureLuminance=max(.008,dot(texel,float3(.2126,.7152,.0722)));
    base*=mix(float3(1.0),texel/.024,.40);
    base*=mix(1.0,clamp(textureLuminance/.024,.72,1.30),.45);
  }else if(materialClass==4){
    // The online street renderer uses staggered rectangular pavers. Rebuild
    // that pattern analytically so it remains sharp and costs no texture IO.
    float2 cell=float2(world.x/.46,world.z/.22);cell.x+=floor(cell.y)*.5;
    float2 edge=min(fract(cell),1.0-fract(cell)),aa=max(fwidth(cell),float2(.012));
    float mortar=1.0-smoothstep(min(aa.x,aa.y)*.65,min(aa.x,aa.y)*1.65,min(edge.x,edge.y));
    float variation=hash21(floor(cell))-.5;
    float3 texel=pavementTexture.sample(surfaceSampler,world.xz/3.2).rgb;
    float textureLuminance=max(.03,dot(texel,float3(.2126,.7152,.0722)));
    base*=mix(float3(1.0),texel/textureLuminance,.16);
    base*=1.0+variation*.035-mortar*.105;
  }else if(materialClass==2){
    float leaf=valueNoise(world.xz*.72+world.y*1.31);
    base*=.88+leaf*.22;
    float neutral=dot(base,float3(.2126,.7152,.0722));base=mix(base,float3(neutral*1.08,neutral,neutral*.76),.36)*1.10;
  }else if(materialClass==5){
    float3 texel=grassTexture.sample(surfaceSampler,world.xz/5.2).rgb;
    float textureLuminance=max(.02,dot(texel,float3(.2126,.7152,.0722)));
    base*=mix(float3(1.0),texel/textureLuminance,.58);
    base*=mix(1.0,clamp(textureLuminance/.075,.76,1.28),.32);
    float neutral=dot(base,float3(.2126,.7152,.0722));base=mix(base,float3(neutral*1.10,neutral,neutral*.78),.52)*.94;
  }else if(materialClass==0){
    float grain=valueNoise(world.xz*.31+world.y*.67);
    base*=.985+grain*.025;
  }
  return mix(original,base,fade);
}
fragment float4 cityFragment(Raster in [[stage_in]], constant Uniforms &u [[buffer(1)]],texture2d<float> asphaltTexture [[texture(0)]],texture2d<float> pavementTexture [[texture(1)]],texture2d<float> grassTexture [[texture(2)]],sampler surfaceSampler [[sampler(0)]]) {
  float3 n=normalize(in.normal),sun=normalize(u.fogEndAndSun.yzw),base=max(in.color.rgb,0.0);
  uint packed=in.color.a>2.0?uint(round(in.color.a)):0u;
  uint materialClass=packed/64u,roughnessCode=(packed/8u)%8u,metalnessCode=packed%8u;
  float roughness=packed?float(roughnessCode)/7.0:(in.color.a<.5?.34:.88);
  float metalness=packed?float(metalnessCode)/7.0:(in.color.a<.5?.14:0.0);
  if(!packed&&in.color.a<.5)materialClass=1u;
  float luminance=dot(base,float3(.2126,.7152,.0722));
  // Authored street batches share the online paver material, but their dark
  // vertex colors distinguish asphalt carriageway from pale sidewalk slabs.
  if(materialClass==4u&&luminance<.16)materialClass=3u;
  if(materialClass==0u&&base.g>base.r*1.35&&base.g>base.b*1.25&&luminance>.025)materialClass=n.y>.78?5u:2u;
  if(materialClass==0u&&n.y>.78){
    if(luminance<.16)materialClass=3u;
    else if(abs(base.r-base.g)<.10&&abs(base.g-base.b)<.10&&luminance>.28)materialClass=4u;
  }
  float distanceToCamera=distance(in.world,u.cameraAndFogStart.xyz),detailFade=1.0-smoothstep(38.0,125.0,distanceToCamera);
  base=materialDetail(base,in.world,n,materialClass,detailFade,asphaltTexture,pavementTexture,grassTexture,surfaceSampler);
  float skyAmount=clamp(n.y*.5+.5,0.0,1.0);
  float3 hemisphere=mix(float3(.216,.184,.130),float3(.716,.855,1.0),skyAmount)*1.65;
  float ndotl=max(0.0,dot(n,sun));
  float3 sunColor=float3(1.0,.871,.665)*2.9;
  float3 diffuse=base*(hemisphere+sunColor*ndotl)/M_PI_F;
  float3 viewDirection=normalize(u.cameraAndFogStart.xyz-in.world),halfway=normalize(sun+viewDirection);
  float ndotv=max(.001,dot(n,viewDirection)),ndoth=max(.001,dot(n,halfway)),vdoth=max(.001,dot(viewDirection,halfway));
  float alpha=max(.035,roughness*roughness),a2=alpha*alpha;
  float denom=ndoth*ndoth*(a2-1.0)+1.0;
  float distribution=a2/max(.001,M_PI_F*denom*denom);
  float k=(roughness+1.0)*(roughness+1.0)/8.0;
  float geometry=(ndotv/(ndotv*(1.0-k)+k))*(ndotl/(ndotl*(1.0-k)+k));
  float3 f0=mix(float3(.04),base,metalness),fresnel=f0+(1.0-f0)*pow(1.0-vdoth,5.0);
  float3 specular=sunColor*(distribution*geometry*fresnel/max(.01,4.0*ndotv*max(.001,ndotl)))*ndotl;
  float rim=pow(1.0-ndotv,4.0),skyReflection=(1.0-roughness)*(.08+.24*rim);
  float3 lit=diffuse*(1.0-metalness)+specular+mix(float3(.13,.25,.34),float3(.62,.79,1.0),skyAmount)*skyReflection;
  if(materialClass==1u)lit=mix(lit,float3(.055,.12,.14),.18+rim*.30);
  if(materialClass==2u)lit+=base*sunColor*max(0.0,dot(-n,sun))*.055;
  lit=acesFilmic(lit*u.viewportAndExposure.z);
  // Intentionally no distance fog: distant geometry keeps its original lit
  // colour instead of being blended into a grey horizon.
  float2 screen=in.position.xy/max(float2(1.0),u.viewportAndExposure.xy);
  float v=abs(screen.y-.5)*2.0;
  lit*=1.0-.10*smoothstep(.48,1.0,v);
  return float4(lit,1.0);
}

struct SkyUniforms { float4 cameraAndTime; float4 viewAndAspect; };
struct SkyRaster { float4 position [[position]]; float2 uv; };
vertex SkyRaster skyVertex(uint id [[vertex_id]]){
  const float2 p[3]={float2(-1,-1),float2(3,-1),float2(-1,3)};
  SkyRaster o;o.position=float4(p[id],.999999,1);o.uv=p[id]*.5+.5;return o;
}
fragment float4 skyFragment(SkyRaster in [[stage_in]],constant SkyUniforms &u [[buffer(0)]]){
  float2 uv=in.uv,centered=float2((uv.x-.5)*u.viewAndAspect.z,uv.y);
  float horizon=smoothstep(0.0,.82,uv.y);
  float3 sky=mix(float3(.72,.90,.91),float3(.145,.285,.505),horizon);
  float2 cloudUv=float2(centered.x*1.52+u.viewAndAspect.x*.20,centered.y*2.15-u.viewAndAspect.y*.13);
  cloudUv+=float2(u.cameraAndTime.w*.0025,0);
  float broad=fbm(cloudUv*2.05+float2(1.7,3.2));
  float detail=fbm(cloudUv*4.55+float2(8.1,1.4));
  float cloud=smoothstep(.47,.63,broad*.76+detail*.31+(1.0-abs(uv.y-.52)*1.15)*.08);
  cloud*=smoothstep(.10,.26,uv.y)*(1.0-smoothstep(.92,1.14,uv.y));
  float shade=smoothstep(.38,.76,fbm(cloudUv*1.74+float2(-3.4,6.2)));
  float3 cloudColor=mix(float3(.39,.46,.51),float3(.94,.96,.94),shade);
  sky=mix(sky,cloudColor,cloud*.92);
  float sunGlow=pow(max(0.0,1.0-length(centered-float2(-.26,.73))*1.45),5.0);
  sky+=float3(1.0,.73,.38)*sunGlow*.22;
  float vertical=abs(uv.y-.5)*2.0;sky*=1.0-.14*smoothstep(.48,1.0,vertical);
  return float4(acesFilmic(sky*.82),1.0);
}
)METAL";

@interface GameView : MTKView {
@public
  bool _keys[256];
  bool _previous[256];
  float _mouseDX, _mouseDY;
  BOOL _mouseCaptured;
}
- (BOOL)isDown:(NSUInteger)key;
- (BOOL)pressed:(NSUInteger)key;
- (void)finishInputFrame;
@end

@implementation GameView
- (instancetype)initWithFrame:(NSRect)frame device:(id<MTLDevice>)device {
  if ((self=[super initWithFrame:frame device:device])) {
    std::fill(std::begin(_keys),std::end(_keys),false);std::fill(std::begin(_previous),std::end(_previous),false);
    _mouseDX=0;_mouseDY=0;_mouseCaptured=NO;
  } return self;
}
- (BOOL)acceptsFirstResponder { return YES; }
- (BOOL)acceptsFirstMouse:(NSEvent *)event { return YES; }
- (void)viewDidMoveToWindow { [super viewDidMoveToWindow];[self.window setAcceptsMouseMovedEvents:YES];[self.window makeFirstResponder:self]; }
- (void)keyDown:(NSEvent *)event { if(event.keyCode<256)_keys[event.keyCode]=true;if(event.keyCode==53&&_mouseCaptured){_mouseCaptured=NO;[NSCursor unhide];} }
- (void)keyUp:(NSEvent *)event { if(event.keyCode<256)_keys[event.keyCode]=false; }
- (void)flagsChanged:(NSEvent *)event {
  _keys[56]=_keys[60]=(event.modifierFlags&NSEventModifierFlagShift)!=0;
  _keys[59]=_keys[62]=(event.modifierFlags&NSEventModifierFlagControl)!=0;
}
- (void)mouseDown:(NSEvent *)event { if(!_mouseCaptured){_mouseCaptured=YES;[NSCursor hide];[self.window makeFirstResponder:self];} }
- (void)mouseMoved:(NSEvent *)event { if(_mouseCaptured){_mouseDX+=event.deltaX;_mouseDY+=event.deltaY;} }
- (void)mouseDragged:(NSEvent *)event { [self mouseMoved:event]; }
- (BOOL)isDown:(NSUInteger)key { return key<256&&_keys[key]; }
- (BOOL)pressed:(NSUInteger)key { return key<256&&_keys[key]&&!_previous[key]; }
- (void)finishInputFrame { std::copy(std::begin(_keys),std::end(_keys),std::begin(_previous));_mouseDX=0;_mouseDY=0; }
@end

@interface MiniMapView : NSView
@property(nonatomic) float worldX;
@property(nonatomic) float worldZ;
@property(nonatomic) float heading;
@property(nonatomic) NSInteger loadedTiles;
@property(nonatomic,copy) void(^onOpen)(void);
@end

@implementation MiniMapView
- (BOOL)isOpaque{return NO;}
- (BOOL)acceptsFirstMouse:(NSEvent*)event{return YES;}
- (void)mouseDown:(NSEvent*)event{if(self.onOpen)self.onOpen();}
- (void)drawRect:(NSRect)dirtyRect {
  NSRect b=self.bounds;[[NSColor colorWithWhite:.035 alpha:.82]setFill];[[NSBezierPath bezierPathWithRoundedRect:b xRadius:12 yRadius:12]fill];
  [[NSColor colorWithWhite:1 alpha:.12]setStroke];
  for(int i=1;i<4;i++){NSBezierPath*p=[NSBezierPath bezierPath];[p moveToPoint:{b.size.width*i/4,8}];[p lineToPoint:{b.size.width*i/4,b.size.height-8}];[p stroke];[p removeAllPoints];[p moveToPoint:{8,b.size.height*i/4}];[p lineToPoint:{b.size.width-8,b.size.height*i/4}];[p stroke];}
  NSPoint c={b.size.width*.5,b.size.height*.5};float s=-std::sin(self.heading),co=std::cos(self.heading);
  NSBezierPath*arrow=[NSBezierPath bezierPath];[arrow moveToPoint:{c.x+s*12,c.y+co*12}];[arrow lineToPoint:{c.x-co*7,c.y+s*7}];[arrow lineToPoint:{c.x+co*7,c.y-s*7}];[arrow closePath];[[NSColor colorWithRed:.97 green:.72 blue:.16 alpha:1]setFill];[arrow fill];
  NSString*coord=[NSString stringWithFormat:@"%.0f · %.0f   %ld dale",self.worldX,self.worldZ,(long)self.loadedTiles];
  [coord drawAtPoint:{10,8} withAttributes:@{NSForegroundColorAttributeName:[NSColor colorWithWhite:1 alpha:.74],NSFontAttributeName:[NSFont monospacedSystemFontOfSize:9 weight:NSFontWeightMedium]}];
}
@end

struct MapDestination { const char* title;float x,z,yaw; };
static constexpr MapDestination kMapDestinations[]={
  {"Catedrala · Centru",23.8f,-185.5f,0},
  {"Arcul de Triumf",21.f,-3.5f,0},
  {"Ștefan cel Mare",-155.f,23.f,3.14159265f},
  {"Opera Maria Bieșu",-340.f,-168.f,0},
  {"Parlamentul",-510.f,80.f,0},
  {"Columna · Ismail",1310.f,-355.5f,-2.342f},
  {"București · Iorga",-215.f,478.f,.791428f},
  {"Șciusev · Tighina",1071.f,612.3f,-.779368f},
  {"Dendrarium",-1993.f,625.f,-2.350165f},
  {"Ion Creangă",-2018.f,19.f,.791428f},
  {"Șciusev 01 · Tighina",1071.f,612.3f,-.779368f},
  {"Șciusev 02 · vest de Tighina",905.f,624.f,2.362224f},
  {"Șciusev 03 · V. Alecsandri",706.f,621.f,2.362224f},
  {"Șciusev 04 · M. Eminescu",554.f,621.f,2.362224f},
  {"Șciusev 05 · Vlaicu Pârcălab",410.f,621.f,2.362224f},
  {"Șciusev 06 · A. Pușkin",269.f,620.f,2.362224f},
  {"Șciusev 07 · Bănulescu-Bodoni",25.f,620.f,2.362224f},
  {"Șciusev 08 · N. Iorga",-202.f,621.f,2.362224f},
  {"Șciusev 09 · M. Cebotari",-356.f,622.f,2.362224f},
  {"Șciusev 10 · Sfatul Țării",-520.f,624.f,2.362224f},
  {"Șciusev 11 · S. Lazo",-675.f,625.f,2.362224f},
  {"Șciusev 12 · C. Stere",-807.f,626.f,2.362224f},
  {"Șciusev 13 · Prometeu",-913.5f,630.f,2.362224f},
  {"Șciusev 14 · nr. 121",-868.f,798.f,.791428f},
  {"Șciusev 15 · curbă",-981.f,610.f,.267829f},
  {"Șciusev 16 · nord",-1031.f,574.f,.267829f},
  {"București 01 · Alecsandri–Armenească",710.f,467.f,-2.350165f},
  {"București 02 · Armenească–Bulgară",910.f,469.f,-2.350165f},
  {"București 03 · Bulgară–Tighina",1114.f,469.f,-2.350165f},
  {"București 04 · Tighina–Ismail",1334.f,469.f,-2.350165f},
  {"București 05 · Ismail–Lev Tolstoi",1515.f,470.f,-2.350165f},
  {"București 06 · Lev Tolstoi–Ciuflea",1638.f,460.75f,-2.350165f},
  {"București 07 · Alecsandri–Eminescu",560.f,461.7f,.791428f},
  {"București 08 · Eminescu–Pârcălab",400.f,462.f,.791428f},
  {"București 09 · Pârcălab–Pușkin",245.f,461.7f,.791428f},
  {"București 10 · Pușkin–Bodoni",0.f,475.f,.791428f},
  {"București 11 · Bodoni–Iorga",-215.f,478.f,.791428f},
  {"Alecsandri VA05 · Șciusev–București",629.f,584.f,-.779368f},
  {"Alecsandri VA06 · București–31 August",629.f,410.f,-.779368f},
  {"Alecsandri VA07 · 31 August–Ștefan",627.f,240.f,-.779368f},
  {"Alecsandri VA08 · Ștefan–Veronica Micle",624.f,-130.f,-.779368f},
  {"Alecsandri VA09 · Veronica Micle–Columna",623.3f,-296.f,-.779368f},
  {"Alecsandri VA10 · Columna–Alexandru",623.4f,-388.f,-.779368f},
  {"Alecsandri VA11 · Alexandru–V. Pîrcălab",622.9f,-454.f,-.779368f},
  {"Alecsandri VA12 · V. Pîrcălab–Kogălniceanu",618.4f,-556.f,-.779368f},
  {"Alecsandri VA13 · Kogălniceanu–Mateevici",618.f,-731.f,-.779368f},
  {"Alecsandri VA14 · Mateevici–Pan Halippa",617.5f,-906.f,-.779368f},
  {"Dendrarium · lac",-1668.f,416.f,2.362224f},
  {"Ion Creangă · Dendrarium",-2060.4f,430.f,.791428f}
};
static constexpr size_t kQuickDestinationCount=10;

static vector_float2 nativeMapPoint(float authoredX,float authoredZ){
  constexpr float rotation=.7793683518335637f;float c=std::cos(rotation),s=std::sin(rotation),dx=authoredX-24.f,dz=authoredZ+15.f;return{c*dx-s*dz,s*dx+c*dz};
}

static bool isHelicopterBenchmark(NSInteger kind){return kind==1||kind==4||kind==9||kind==10;}
static vector_float2 helicopterBenchmarkStart(NSInteger kind){
  if(kind==4)return{1064.925f,586.852f};
  if(kind==9)return nativeMapPoint(1071.f,612.3f);
  if(kind==10)return nativeMapPoint(1638.f,460.75f);
  return{108.82f,-130.06f};
}
static float helicopterBenchmarkHeading(NSInteger kind){
  if(kind==4)return-2.342f;
  if(kind==9||kind==10){vector_float2 start=helicopterBenchmarkStart(kind),end=kind==9?nativeMapPoint(-1031.f,574.f):nativeMapPoint(-215.f,478.f);return std::atan2(-(end.x-start.x),-(end.y-start.y));}
  return.3f;
}

@interface WorldMapView : NSView {
  NSImage *_mapImage;
  NSButton *_closeButton,*_teleportButton,*_recenterButton,*_zoomInButton,*_zoomOutButton;
  NSPopUpButton *_sectorMenu;
  NSArray<NSButton*> *_destinationButtons;
  float _centerX,_centerZ,_zoom,_destinationX,_destinationZ,_destinationYaw;
  BOOL _hasDestination,_dragging;
  NSPoint _dragStart,_lastDrag;
}
@property(nonatomic) float playerX,playerZ,heading,carX,carZ,helicopterX,helicopterZ;
@property(nonatomic,copy) void(^onTeleport)(float x,float z,float yaw);
@property(nonatomic,copy) void(^onClose)(void);
- (instancetype)initWithFrame:(NSRect)frame mapPath:(NSString*)mapPath;
@end

@implementation WorldMapView
static constexpr float kMapMin=-3300.f,kMapMax=3300.f,kMapRange=6600.f;
- (instancetype)initWithFrame:(NSRect)frame mapPath:(NSString*)mapPath {
  if(!(self=[super initWithFrame:frame]))return nil;
  self.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;self.wantsLayer=YES;self.layer.backgroundColor=[NSColor colorWithWhite:.015 alpha:.96].CGColor;
  _mapImage=[[NSImage alloc]initWithContentsOfFile:mapPath];_centerX=0;_centerZ=0;_zoom=1.35f;
  _closeButton=[NSButton buttonWithTitle:@"Închide · M / Esc" target:self action:@selector(closeMap:)];
  _teleportButton=[NSButton buttonWithTitle:@"TELEPORTEAZĂ AICI  ↗" target:self action:@selector(teleport:)];_teleportButton.enabled=NO;
  _recenterButton=[NSButton buttonWithTitle:@"Poziția mea" target:self action:@selector(recenter:)];
  _zoomInButton=[NSButton buttonWithTitle:@"+" target:self action:@selector(zoomIn:)];_zoomOutButton=[NSButton buttonWithTitle:@"−" target:self action:@selector(zoomOut:)];
  NSMutableArray*buttons=[NSMutableArray array];
  for(size_t i=0;i<std::min(kQuickDestinationCount,std::size(kMapDestinations));i++){
    NSButton*button=[NSButton buttonWithTitle:[NSString stringWithUTF8String:kMapDestinations[i].title] target:self action:@selector(destination:)];button.tag=(NSInteger)i;button.alignment=NSTextAlignmentLeft;button.bezelStyle=NSBezelStyleRounded;button.font=[NSFont systemFontOfSize:12 weight:NSFontWeightMedium];[buttons addObject:button];[self addSubview:button];
  }
  _destinationButtons=buttons;
  _sectorMenu=[[NSPopUpButton alloc]initWithFrame:NSZeroRect pullsDown:NO];[_sectorMenu addItemWithTitle:@"Toate tronsoanele reconstruite…"];
  for(size_t i=kQuickDestinationCount;i<std::size(kMapDestinations);i++){[_sectorMenu addItemWithTitle:[NSString stringWithUTF8String:kMapDestinations[i].title]];[_sectorMenu itemAtIndex:_sectorMenu.numberOfItems-1].tag=(NSInteger)i;}
  _sectorMenu.target=self;_sectorMenu.action=@selector(destinationMenu:);_sectorMenu.font=[NSFont systemFontOfSize:11 weight:NSFontWeightMedium];[self addSubview:_sectorMenu];
  for(NSButton*button in @[_closeButton,_teleportButton,_recenterButton,_zoomInButton,_zoomOutButton]){button.bezelStyle=NSBezelStyleRounded;[self addSubview:button];}
  _teleportButton.contentTintColor=[NSColor colorWithRed:.98 green:.72 blue:.18 alpha:1];
  return self;
}
- (BOOL)isOpaque{return YES;}
- (BOOL)acceptsFirstResponder{return YES;}
- (BOOL)acceptsFirstMouse:(NSEvent*)event{return YES;}
- (NSRect)mapRect { return NSMakeRect(34,88,std::max(420.f,(float)self.bounds.size.width-354.f),std::max(300.f,(float)self.bounds.size.height-164.f)); }
- (float)metersPerPixel { return kMapRange/(_zoom*[self mapRect].size.width); }
- (void)clampCenter {
  NSRect map=[self mapRect];float halfX=[self metersPerPixel]*map.size.width*.5f,halfZ=[self metersPerPixel]*map.size.height*.5f;
  _centerX=std::clamp(_centerX,kMapMin+std::min(halfX,kMapRange*.5f),kMapMax-std::min(halfX,kMapRange*.5f));
  _centerZ=std::clamp(_centerZ,kMapMin+std::min(halfZ,kMapRange*.5f),kMapMax-std::min(halfZ,kMapRange*.5f));
}
- (NSPoint)viewPointX:(float)x z:(float)z {
  NSRect map=[self mapRect];float scale=1.f/[self metersPerPixel];return{NSMidX(map)+(x-_centerX)*scale,NSMidY(map)-(z-_centerZ)*scale};
}
- (vector_float2)worldPoint:(NSPoint)p {
  NSRect map=[self mapRect];float meters=[self metersPerPixel];return{_centerX+(float)(p.x-NSMidX(map))*meters,_centerZ-(float)(p.y-NSMidY(map))*meters};
}
- (void)layout {
  [super layout];NSRect b=self.bounds;_closeButton.frame=NSMakeRect(b.size.width-182,b.size.height-56,148,30);
  NSRect map=[self mapRect];float sideX=NSMaxX(map)+18,sideWidth=std::max(170.f,(float)b.size.width-sideX-34.f);float top=NSMaxY(map)-32;
  for(NSUInteger i=0;i<_destinationButtons.count;i++)_destinationButtons[i].frame=NSMakeRect(sideX,top-(float)i*34,sideWidth,28);
  _sectorMenu.frame=NSMakeRect(sideX,std::max(112.f,top-374.f),sideWidth,30);
  _zoomOutButton.frame=NSMakeRect(34,35,40,32);_zoomInButton.frame=NSMakeRect(78,35,40,32);_recenterButton.frame=NSMakeRect(126,35,112,32);_teleportButton.frame=NSMakeRect(b.size.width-250,31,216,38);
  [self clampCenter];
}
- (void)drawMarkerAt:(NSPoint)p color:(NSColor*)color radius:(float)radius {
  NSBezierPath*dot=[NSBezierPath bezierPathWithOvalInRect:NSMakeRect(p.x-radius,p.y-radius,radius*2,radius*2)];[color setFill];[dot fill];[[NSColor colorWithWhite:1 alpha:.9]setStroke];dot.lineWidth=1.5;[dot stroke];
}
- (void)drawRect:(NSRect)dirtyRect {
  [[NSColor colorWithWhite:.018 alpha:1]setFill];NSRectFill(self.bounds);
  NSDictionary*title=@{NSForegroundColorAttributeName:NSColor.whiteColor,NSFontAttributeName:[NSFont systemFontOfSize:23 weight:NSFontWeightBold]};
  [@"HARTĂ · CHIȘINĂU" drawAtPoint:NSMakePoint(34,self.bounds.size.height-51) withAttributes:title];
  [@"Trage harta · scroll pentru zoom · clic pentru destinație · Enter pentru teleportare" drawAtPoint:NSMakePoint(34,self.bounds.size.height-72) withAttributes:@{NSForegroundColorAttributeName:[NSColor colorWithWhite:1 alpha:.62],NSFontAttributeName:[NSFont systemFontOfSize:11]}];
  NSRect map=[self mapRect];NSBezierPath*clip=[NSBezierPath bezierPathWithRoundedRect:map xRadius:13 yRadius:13];[NSGraphicsContext saveGraphicsState];[clip addClip];
  [[NSColor colorWithRed:.035 green:.075 blue:.066 alpha:1]setFill];NSRectFill(map);
  if(_mapImage){float scale=1.f/[self metersPerPixel],side=kMapRange*scale;NSPoint bottomLeft=[self viewPointX:kMapMin z:kMapMax];[[NSGraphicsContext currentContext]setImageInterpolation:NSImageInterpolationHigh];[_mapImage drawInRect:NSMakeRect(bottomLeft.x,bottomLeft.y,side,side)];}
  for(int i=-3000;i<=3000;i+=500){NSPoint a=[self viewPointX:(float)i z:kMapMin],b=[self viewPointX:(float)i z:kMapMax],c=[self viewPointX:kMapMin z:(float)i],d=[self viewPointX:kMapMax z:(float)i];[[NSColor colorWithWhite:1 alpha:.055]setStroke];NSBezierPath*p=[NSBezierPath bezierPath];[p moveToPoint:a];[p lineToPoint:b];[p moveToPoint:c];[p lineToPoint:d];[p stroke];}
  for(const auto&destination:kMapDestinations){vector_float2 world=nativeMapPoint(destination.x,destination.z);NSPoint p=[self viewPointX:world.x z:world.y];if(NSPointInRect(p,map))[self drawMarkerAt:p color:[NSColor colorWithRed:.94 green:.61 blue:.15 alpha:.9] radius:3.5];}
  [self drawMarkerAt:[self viewPointX:self.carX z:self.carZ] color:[NSColor colorWithRed:.88 green:.25 blue:.18 alpha:1] radius:4];
  [self drawMarkerAt:[self viewPointX:self.helicopterX z:self.helicopterZ] color:[NSColor colorWithRed:.30 green:.62 blue:.98 alpha:1] radius:4];
  NSPoint player=[self viewPointX:self.playerX z:self.playerZ];float s=-std::sin(self.heading),c=std::cos(self.heading);NSBezierPath*arrow=[NSBezierPath bezierPath];[arrow moveToPoint:{player.x+s*13,player.y+c*13}];[arrow lineToPoint:{player.x-c*7,player.y+s*7}];[arrow lineToPoint:{player.x+c*7,player.y-s*7}];[arrow closePath];[[NSColor colorWithRed:.18 green:.68 blue:1 alpha:1]setFill];[arrow fill];[[NSColor whiteColor]setStroke];arrow.lineWidth=1.5;[arrow stroke];
  if(_hasDestination){NSPoint p=[self viewPointX:_destinationX z:_destinationZ];NSBezierPath*ring=[NSBezierPath bezierPathWithOvalInRect:NSMakeRect(p.x-9,p.y-9,18,18)];[[NSColor colorWithRed:1 green:.73 blue:.15 alpha:1]setStroke];ring.lineWidth=3;[ring stroke];NSBezierPath*stem=[NSBezierPath bezierPath];[stem moveToPoint:{p.x,p.y-9}];[stem lineToPoint:{p.x,p.y-20}];stem.lineWidth=3;[stem stroke];}
  [NSGraphicsContext restoreGraphicsState];[[NSColor colorWithWhite:1 alpha:.15]setStroke];clip.lineWidth=1.5;[clip stroke];
  NSString*coord=_hasDestination?[NSString stringWithFormat:@"Destinație: %.0f · %.0f",_destinationX,_destinationZ]:@"Selectează un punct sau un reper";
  [coord drawAtPoint:NSMakePoint(252,43) withAttributes:@{NSForegroundColorAttributeName:[NSColor colorWithWhite:1 alpha:.78],NSFontAttributeName:[NSFont monospacedSystemFontOfSize:11 weight:NSFontWeightMedium]}];
  [@"REPERE RAPIDE" drawAtPoint:NSMakePoint(NSMaxX(map)+18,NSMaxY(map)+8) withAttributes:@{NSForegroundColorAttributeName:[NSColor colorWithWhite:1 alpha:.6],NSFontAttributeName:[NSFont systemFontOfSize:10 weight:NSFontWeightBold]}];
  [@"TOATE SECTOARELE LUCRATE" drawAtPoint:NSMakePoint(NSMaxX(map)+18,std::max<CGFloat>(96,NSMaxY(map)-414)) withAttributes:@{NSForegroundColorAttributeName:[NSColor colorWithWhite:1 alpha:.6],NSFontAttributeName:[NSFont systemFontOfSize:9 weight:NSFontWeightBold]}];
  [@"● pieton   ● mașină   ● elicopter" drawAtPoint:NSMakePoint(NSMaxX(map)+18,94) withAttributes:@{NSForegroundColorAttributeName:[NSColor colorWithWhite:1 alpha:.52],NSFontAttributeName:[NSFont systemFontOfSize:10]}];
}
- (void)setPlayerX:(float)value{_playerX=value;[self setNeedsDisplay:YES];}
- (void)setPlayerZ:(float)value{_playerZ=value;[self setNeedsDisplay:YES];}
- (void)closeMap:(id)sender{if(self.onClose)self.onClose();}
- (void)teleport:(id)sender{if(_hasDestination&&self.onTeleport)self.onTeleport(_destinationX,_destinationZ,_destinationYaw);}
- (void)recenter:(id)sender{_centerX=self.playerX;_centerZ=self.playerZ;_zoom=2.8f;[self clampCenter];[self setNeedsDisplay:YES];}
- (void)zoomBy:(float)factor{_zoom=std::clamp(_zoom*factor,1.f,6.f);[self clampCenter];[self setNeedsDisplay:YES];}
- (void)zoomIn:(id)sender{[self zoomBy:1.32f];}
- (void)zoomOut:(id)sender{[self zoomBy:1.f/1.32f];}
- (void)destination:(NSButton*)sender {const auto&item=kMapDestinations[(size_t)sender.tag];vector_float2 p=nativeMapPoint(item.x,item.z);_destinationX=p.x;_destinationZ=p.y;_destinationYaw=item.yaw;_hasDestination=YES;_teleportButton.enabled=YES;_centerX=p.x;_centerZ=p.y;_zoom=3.15f;[self clampCenter];[self setNeedsDisplay:YES];}
- (void)destinationMenu:(NSPopUpButton*)sender {NSInteger tag=sender.selectedItem.tag;if(sender.indexOfSelectedItem==0||tag<0||tag>=(NSInteger)std::size(kMapDestinations))return;const auto&item=kMapDestinations[(size_t)tag];vector_float2 p=nativeMapPoint(item.x,item.z);_destinationX=p.x;_destinationZ=p.y;_destinationYaw=item.yaw;_hasDestination=YES;_teleportButton.enabled=YES;_centerX=p.x;_centerZ=p.y;_zoom=3.15f;[self clampCenter];[self setNeedsDisplay:YES];}
- (void)mouseDown:(NSEvent*)event{[self.window makeFirstResponder:self];_dragStart=_lastDrag=[self convertPoint:event.locationInWindow fromView:nil];_dragging=NO;}
- (void)mouseDragged:(NSEvent*)event{NSPoint p=[self convertPoint:event.locationInWindow fromView:nil];if(!NSPointInRect(_dragStart,[self mapRect]))return;float meters=[self metersPerPixel];_centerX-=(p.x-_lastDrag.x)*meters;_centerZ+=(p.y-_lastDrag.y)*meters;_lastDrag=p;_dragging=YES;[self clampCenter];[self setNeedsDisplay:YES];}
- (void)mouseUp:(NSEvent*)event{NSPoint p=[self convertPoint:event.locationInWindow fromView:nil];if(!NSPointInRect(p,[self mapRect]))return;if(!_dragging||std::hypot(p.x-_dragStart.x,p.y-_dragStart.y)<5){vector_float2 point=[self worldPoint:p];_destinationX=point.x;_destinationZ=point.y;_destinationYaw=0;_hasDestination=YES;_teleportButton.enabled=YES;[self setNeedsDisplay:YES];if(event.clickCount>1)[self teleport:nil];}}
- (void)scrollWheel:(NSEvent*)event{[self zoomBy:event.scrollingDeltaY<0?1.18f:1.f/1.18f];}
- (void)keyDown:(NSEvent*)event{
  if(event.keyCode==53||event.keyCode==46){[self closeMap:nil];return;}if(event.keyCode==36||event.keyCode==76){[self teleport:nil];return;}if(event.keyCode==24){[self zoomIn:nil];return;}if(event.keyCode==27){[self zoomOut:nil];return;}
  float amount=150.f/_zoom;if(event.keyCode==123)_centerX-=amount;else if(event.keyCode==124)_centerX+=amount;else if(event.keyCode==126)_centerZ-=amount;else if(event.keyCode==125)_centerZ+=amount;else{[super keyDown:event];return;}[self clampCenter];[self setNeedsDisplay:YES];
}
@end

enum class PlayerMode { Walker=1, Car=2, Helicopter=3 };
struct PlayerState { vector_float3 position{0,0,0};vector_float3 velocity{0,0,0};float yaw=0;float speed=0; };
struct CarPhysics {
  float steer=0,acceleration=0,bodyPitch=0,bodyRoll=0,distance=0,impact=0;
  bool braking=false,reversing=false,handbrake=false;
};
struct HelicopterPhysics {
  float rotor=0,pitch=0,bank=0,yawRate=0;
  bool grounded=true,contact=false;
};
struct TileBufferChunk { id<MTLBuffer> buffer=nil;uint32_t vertexCount=0; };

struct TileMeta {
  std::string path;
  int x=0,y=0,state=0;
  bool detail=false;
  float centerX=0,centerZ=0;
  uint32_t vertexCount=0,collisionCount=0;
  std::vector<TileBufferChunk> chunks;
  size_t visibleChunks=0;
  std::vector<CollisionSegment> collisions;
  double lastNear=0;
};
struct PendingTile {
  size_t index=0;
  std::vector<uint8_t> bytes;
  std::vector<TileBufferChunk> chunks;
  uint32_t vertexCount=0,nextVertex=0;
  std::vector<CollisionSegment> collisions;
  bool ok=false;
};

@interface CityRenderer : NSObject<MTKViewDelegate> {
  GameView *_view;
  id<MTLDevice> _device;
  id<MTLCommandQueue> _queue;
  id<MTLRenderPipelineState> _pipeline;
  id<MTLRenderPipelineState> _skyPipeline;
  id<MTLDepthStencilState> _depth;
  id<MTLDepthStencilState> _skyDepth;
  id<MTLTexture> _asphaltTexture,_pavementTexture,_grassTexture;
  id<MTLSamplerState> _surfaceSampler;
  id<MTLBuffer> _cube;
  NSUInteger _cubeCount;
  ModelMesh _helicopterModel,_priusModel,_walkerModel;
  std::array<ModelMesh,8> _walkerWalkFrames,_walkerRunFrames;
  std::vector<TileMeta> _tiles;
  std::deque<TileBufferChunk> _retiredChunks;
  std::mutex _pendingMutex;
  std::vector<PendingTile> _pending;
  PlayerMode _mode;
  PlayerState _walker,_car,_helicopter;
  CarPhysics _carPhysics;
  HelicopterPhysics _heliPhysics;
  vector_float3 _camera,_cameraTarget;
  float _cameraYaw,_cameraPitch,_cameraManualTimer,_rotorAngle,_walkerAnimationPhase;
  float _fogStart,_fogEnd;
  double _lastFrame,_startTime,_lastHUD,_fpsAccumulator;
  double _noticeUntil;
  int _fpsFrames;
  float _displayFPS;
  NSTextField *_hud,*_controls,*_notice;
  MiniMapView *_minimap;
  WorldMapView *_worldMap;
  NSString *_resourcePath;
  BOOL _mapOpen,_teleportPending,_mapTestOpened,_mapTestTeleported;
  vector_float3 _pendingTeleport;
  float _pendingTeleportYaw;
  double _teleportStartedAt;
  NSInteger _benchmarkKind;
  BOOL _benchmark,_benchmarkFinished;
  double _benchmarkStart;
  std::vector<double> _benchmarkFrames;
  NSUInteger _stutters25,_stutters34,_stutters50;
  double _maxBenchmarkFrame,_maxBenchmarkFrameAt;
  float _carBenchmarkMaxForward,_carBenchmarkMaxReverse;
  float _carStraightMaxDeviation,_heliStraightMaxDeviation;
  float _walkerTestDistance,_walkerFacingError;
  BOOL _carBenchmarkReversed;
  int _interactionStage;
  BOOL _interactionCarEntry,_interactionCarExit,_interactionHeliEntry,_interactionHeliExit;
  BOOL _spawnTestCar,_spawnTestHelicopter;
}
- (instancetype)initWithView:(GameView*)view resourcePath:(NSString*)resourcePath benchmarkKind:(NSInteger)benchmarkKind;
@end

static void pushVertex(std::vector<PackedVertex>&v,float x,float y,float z,float nx,float ny,float nz) { v.push_back({x,y,z,nx,ny,nz,1,1,1,1}); }
static void pushTriangle(std::vector<PackedVertex>&v,vector_float3 a,vector_float3 b,vector_float3 c,vector_float3 n){pushVertex(v,a.x,a.y,a.z,n.x,n.y,n.z);pushVertex(v,b.x,b.y,b.z,n.x,n.y,n.z);pushVertex(v,c.x,c.y,c.z,n.x,n.y,n.z);}
static std::vector<PackedVertex> makeCube() {
  std::vector<PackedVertex>v;float a=-.5f,b=.5f;
  struct Face{vector_float3 p[4],n;};
  Face f[]={{{{a,a,b},{b,a,b},{b,b,b},{a,b,b}},{0,0,1}},{{{b,a,a},{a,a,a},{a,b,a},{b,b,a}},{0,0,-1}},{{{b,a,b},{b,a,a},{b,b,a},{b,b,b}},{1,0,0}},{{{a,a,a},{a,a,b},{a,b,b},{a,b,a}},{-1,0,0}},{{{a,b,b},{b,b,b},{b,b,a},{a,b,a}},{0,1,0}},{{{a,a,a},{b,a,a},{b,a,b},{a,a,b}},{0,-1,0}}};
  for(auto&q:f){pushTriangle(v,q.p[0],q.p[1],q.p[2],q.n);pushTriangle(v,q.p[0],q.p[2],q.p[3],q.n);}return v;
}

static float pointSegmentDistanceSquared(float x,float z,const CollisionSegment&s){
  float dx=s.bx-s.ax,dz=s.bz-s.az,lengthSquared=dx*dx+dz*dz;
  float t=lengthSquared>1e-8f?std::clamp(((x-s.ax)*dx+(z-s.az)*dz)/lengthSquared,0.f,1.f):0.f;
  float px=s.ax+dx*t,pz=s.az+dz*t,ox=x-px,oz=z-pz;return ox*ox+oz*oz;
}

static bool segmentIntersectsRect(float x0,float z0,float x1,float z1,float halfWidth,float halfLength){
  float tMin=0,tMax=1;
  auto slab=[&](float a,float b,float extent){float d=b-a;if(std::abs(d)<1e-7f)return std::abs(a)<=extent;float lo=(-extent-a)/d,hi=(extent-a)/d;if(lo>hi)std::swap(lo,hi);tMin=std::max(tMin,lo);tMax=std::min(tMax,hi);return tMin<=tMax;};
  return slab(x0,x1,halfWidth)&&slab(z0,z1,halfLength);
}

static ModelMesh loadCompiledModel(id<MTLDevice>device,const std::filesystem::path&file) {
  ModelMesh result;std::ifstream stream(file,std::ios::binary|std::ios::ate);if(!stream)return result;auto size=stream.tellg();if(size<(std::streamoff)sizeof(MeshHeader))return result;
  std::vector<uint8_t>bytes((size_t)size);stream.seekg(0);stream.read(reinterpret_cast<char*>(bytes.data()),size);auto*h=reinterpret_cast<const MeshHeader*>(bytes.data());size_t dataBytes=(size_t)h->vertexCount*sizeof(PackedVertex);
  if(!stream||h->magic!=0x48534d43||h->version!=1||sizeof(MeshHeader)+dataBytes>bytes.size())return result;
  result.buffer=[device newBufferWithBytes:bytes.data()+sizeof(MeshHeader) length:dataBytes options:MTLResourceStorageModeShared];result.vertexCount=h->vertexCount;result.min={h->min[0],h->min[1],h->min[2]};result.max={h->max[0],h->max[1],h->max[2]};return result;
}

@implementation CityRenderer
- (instancetype)initWithView:(GameView*)view resourcePath:(NSString*)resourcePath benchmarkKind:(NSInteger)benchmarkKind {
  if(!(self=[super init]))return nil;
  _view=view;_device=view.device;_resourcePath=[resourcePath copy];_benchmarkKind=benchmarkKind;_benchmark=(benchmarkKind>0&&benchmarkKind<5)||benchmarkKind==6||benchmarkKind==7||benchmarkKind==9||benchmarkKind==10||benchmarkKind==11;_benchmarkFinished=NO;_mode=benchmarkKind==2?PlayerMode::Car:isHelicopterBenchmark(benchmarkKind)?PlayerMode::Helicopter:PlayerMode::Walker;
  _queue=[_device newCommandQueue];NSError*error=nil;id<MTLLibrary>library=[_device newLibraryWithSource:kShaderSource options:nil error:&error];
  if(!library){NSLog(@"Metal shader error: %@",error);return nil;}
  MTLRenderPipelineDescriptor*descriptor=[MTLRenderPipelineDescriptor new];descriptor.vertexFunction=[library newFunctionWithName:@"cityVertex"];descriptor.fragmentFunction=[library newFunctionWithName:@"cityFragment"];
  descriptor.colorAttachments[0].pixelFormat=view.colorPixelFormat;descriptor.depthAttachmentPixelFormat=view.depthStencilPixelFormat;
  _pipeline=[_device newRenderPipelineStateWithDescriptor:descriptor error:&error];if(!_pipeline){NSLog(@"Metal pipeline error: %@",error);return nil;}
  MTLRenderPipelineDescriptor*skyDescriptor=[MTLRenderPipelineDescriptor new];skyDescriptor.vertexFunction=[library newFunctionWithName:@"skyVertex"];skyDescriptor.fragmentFunction=[library newFunctionWithName:@"skyFragment"];
  skyDescriptor.colorAttachments[0].pixelFormat=view.colorPixelFormat;skyDescriptor.depthAttachmentPixelFormat=view.depthStencilPixelFormat;
  _skyPipeline=[_device newRenderPipelineStateWithDescriptor:skyDescriptor error:&error];if(!_skyPipeline){NSLog(@"Metal sky pipeline error: %@",error);return nil;}
  MTLDepthStencilDescriptor*depth=[MTLDepthStencilDescriptor new];depth.depthCompareFunction=MTLCompareFunctionLessEqual;depth.depthWriteEnabled=YES;_depth=[_device newDepthStencilStateWithDescriptor:depth];
  MTLDepthStencilDescriptor*skyDepth=[MTLDepthStencilDescriptor new];skyDepth.depthCompareFunction=MTLCompareFunctionAlways;skyDepth.depthWriteEnabled=NO;_skyDepth=[_device newDepthStencilStateWithDescriptor:skyDepth];
  MTKTextureLoader*textureLoader=[[MTKTextureLoader alloc]initWithDevice:_device];NSDictionary*textureOptions=@{MTKTextureLoaderOptionSRGB:@YES,MTKTextureLoaderOptionGenerateMipmaps:@YES,MTKTextureLoaderOptionTextureUsage:@(MTLTextureUsageShaderRead)};
  auto loadSurfaceTexture=^(NSString*name){NSString*path=[resourcePath stringByAppendingPathComponent:[@"textures" stringByAppendingPathComponent:name]];NSError*textureError=nil;id<MTLTexture>texture=[textureLoader newTextureWithContentsOfURL:[NSURL fileURLWithPath:path] options:textureOptions error:&textureError];if(!texture){NSImage*source=[[NSImage alloc]initWithContentsOfFile:path];CGImageRef image=[source CGImageForProposedRect:nil context:nil hints:nil];if(image)texture=[textureLoader newTextureWithCGImage:image options:textureOptions error:&textureError];}if(!texture)NSLog(@"Surface texture %@: %@",name,textureError);return texture;};
  _asphaltTexture=loadSurfaceTexture(@"asphalt_diffuse.png");_pavementTexture=loadSurfaceTexture(@"pavement_diffuse.png");_grassTexture=loadSurfaceTexture(@"grass_diffuse.png");
  if(!_asphaltTexture||!_pavementTexture||!_grassTexture)return nil;
  MTLSamplerDescriptor*surfaceSampler=[MTLSamplerDescriptor new];surfaceSampler.sAddressMode=surfaceSampler.tAddressMode=MTLSamplerAddressModeRepeat;surfaceSampler.minFilter=surfaceSampler.magFilter=MTLSamplerMinMagFilterLinear;surfaceSampler.mipFilter=MTLSamplerMipFilterLinear;surfaceSampler.maxAnisotropy=8;_surfaceSampler=[_device newSamplerStateWithDescriptor:surfaceSampler];
  auto cube=makeCube();_cubeCount=cube.size();_cube=[_device newBufferWithBytes:cube.data() length:cube.size()*sizeof(PackedVertex) options:MTLResourceStorageModeShared];
  std::filesystem::path modelPath=std::filesystem::path(resourcePath.UTF8String)/"models";_helicopterModel=loadCompiledModel(_device,modelPath/"helicopter.cmesh");_priusModel=loadCompiledModel(_device,modelPath/"prius.cmesh");_walkerModel=loadCompiledModel(_device,modelPath/"walker.cmesh");
  for(size_t i=0;i<8;i++){_walkerWalkFrames[i]=loadCompiledModel(_device,modelPath/("walker_walk_"+std::to_string(i)+".cmesh"));_walkerRunFrames[i]=loadCompiledModel(_device,modelPath/("walker_run_"+std::to_string(i)+".cmesh"));}
  _walker.position=benchmarkKind==5?(vector_float3){1148.146f,.92f,667.669f}:(vector_float3){119.69f,.92f,-121.43f};_car.position={128.f,.72f,-113.f};
  vector_float2 benchmarkStart=helicopterBenchmarkStart(benchmarkKind);_helicopter.position={benchmarkStart.x,isHelicopterBenchmark(benchmarkKind)?58.f:.05f,benchmarkStart.y};_helicopter.yaw=helicopterBenchmarkHeading(benchmarkKind);
  _heliPhysics.grounded=!isHelicopterBenchmark(benchmarkKind);_heliPhysics.rotor=isHelicopterBenchmark(benchmarkKind)?1.f:0.f;
  _camera=_mode==PlayerMode::Helicopter?_helicopter.position+(vector_float3){-16,10,20}:benchmarkKind==5?_walker.position+(vector_float3){-4,3,-4}:(vector_float3){98.3f,8.8f,-115.15f};_cameraTarget=_mode==PlayerMode::Helicopter?_helicopter.position:benchmarkKind==5?_walker.position:(vector_float3){144.08f,10,-145.83f};_cameraYaw=_mode==PlayerMode::Helicopter?_helicopter.yaw:benchmarkKind==5?-2.342f:.78f;_cameraPitch=.15f;_cameraManualTimer=0;_rotorAngle=0;_walkerAnimationPhase=0;
  _fogEnd=kNoFogViewDistance;_fogStart=kNoFogViewDistance;
  _lastFrame=CACurrentMediaTime();_startTime=_lastFrame;_benchmarkStart=_lastFrame;_lastHUD=0;_noticeUntil=0;_fpsAccumulator=0;_fpsFrames=0;_displayFPS=60;
  _stutters25=_stutters34=_stutters50=0;
  _walkerTestDistance=0;_walkerFacingError=0;
  _interactionStage=0;_interactionCarEntry=_interactionCarExit=_interactionHeliEntry=_interactionHeliExit=NO;_spawnTestCar=_spawnTestHelicopter=NO;_mapOpen=_teleportPending=_mapTestOpened=_mapTestTeleported=NO;
  std::filesystem::path worldPath=std::filesystem::path(resourcePath.UTF8String)/"world";
  if(std::filesystem::exists(worldPath))for(const auto&entry:std::filesystem::directory_iterator(worldPath))if(entry.path().extension()==".ctile"||entry.path().extension()==".dtile"){
    std::ifstream stream(entry.path(),std::ios::binary);TileHeader h{};stream.read(reinterpret_cast<char*>(&h),sizeof(h));
    if(stream&&h.magic==0x4c495443&&h.version==1){TileMeta tile;tile.path=entry.path().string();tile.detail=entry.path().extension()==".dtile";tile.x=h.x;tile.y=h.y;tile.centerX=h.centerX;tile.centerZ=h.centerZ;tile.vertexCount=h.vertexCount;tile.collisionCount=h.collisionCount;_tiles.push_back(std::move(tile));}
  }
  std::sort(_tiles.begin(),_tiles.end(),[](const TileMeta&a,const TileMeta&b){return a.x<b.x||(a.x==b.x&&a.y<b.y);});
  [self createHUD];
  if(_benchmarkKind==8)dispatch_async(dispatch_get_main_queue(),^{[self openWorldMap];});
  return self;
}

- (void)createHUD {
  auto makeLabel=^(NSRect frame,CGFloat size,NSFontWeight weight){NSTextField*l=[[NSTextField alloc]initWithFrame:frame];l.editable=NO;l.selectable=NO;l.bordered=NO;l.drawsBackground=NO;l.textColor=NSColor.whiteColor;l.font=[NSFont monospacedSystemFontOfSize:size weight:weight];l.maximumNumberOfLines=5;l.lineBreakMode=NSLineBreakByWordWrapping;[_view addSubview:l];return l;};
  _hud=makeLabel(NSMakeRect(22,_view.bounds.size.height-112,420,90),14,NSFontWeightSemibold);_hud.autoresizingMask=NSViewMinYMargin;
  _controls=makeLabel(NSMakeRect(22,18,820,66),12,NSFontWeightMedium);_controls.textColor=[NSColor colorWithWhite:1 alpha:.83];_controls.autoresizingMask=NSViewMaxYMargin|NSViewWidthSizable;
  _notice=makeLabel(NSMakeRect(_view.bounds.size.width/2-260,_view.bounds.size.height-64,520,34),13,NSFontWeightSemibold);_notice.alignment=NSTextAlignmentCenter;_notice.autoresizingMask=NSViewMinXMargin|NSViewMaxXMargin|NSViewMinYMargin;
  _notice.stringValue=_benchmark?(_benchmarkKind==3?@"TEST INTERACȚIUNE · intrare / ieșire":_benchmarkKind==6?@"TEST PIETON · mers, orientare și animație":_benchmarkKind==7?@"TEST HARTĂ · teleportare și streaming":_benchmarkKind==11?@"TEST GENERARE · mașină și elicopter":_benchmarkKind==2?@"BENCHMARK MAȘINĂ · fizică 120 Hz":_benchmarkKind==4?@"BENCHMARK COLUMNA · streaming în zbor":_benchmarkKind==9?@"BENCHMARK ȘCIUSEV · toate modulele în zbor":_benchmarkKind==10?@"BENCHMARK BUCUREȘTI · toate modulele în zbor":@"BENCHMARK ELICOPTER · traseu automat"):_benchmarkKind==5?@"COL-IT-01 · COLUMNA · TIGHINA → ISMAIL":@"Click pentru cameră · M hartă · E intră / iese";
  _minimap=[[MiniMapView alloc]initWithFrame:NSMakeRect(_view.bounds.size.width-192,22,170,170)];_minimap.autoresizingMask=NSViewMinXMargin|NSViewMaxYMargin;__weak CityRenderer*weakSelf=self;_minimap.onOpen=^{[weakSelf openWorldMap];};[_view addSubview:_minimap];
}

- (void)clearGameInput {
  std::fill(std::begin(_view->_keys),std::end(_view->_keys),false);std::fill(std::begin(_view->_previous),std::end(_view->_previous),false);_view->_mouseDX=_view->_mouseDY=0;
}

- (void)openWorldMap {
  if(_mapOpen||_benchmarkKind>0&&_benchmarkKind!=7&&_benchmarkKind!=8)return;_mapOpen=YES;[self clearGameInput];
  if(_view->_mouseCaptured){_view->_mouseCaptured=NO;[NSCursor unhide];}
  NSString*path=[_resourcePath stringByAppendingPathComponent:@"map/world-map.png"];
  _worldMap=[[WorldMapView alloc]initWithFrame:_view.bounds mapPath:path];PlayerState&p=[self activePlayer];_worldMap.playerX=p.position.x;_worldMap.playerZ=p.position.z;_worldMap.heading=p.yaw;_worldMap.carX=_car.position.x;_worldMap.carZ=_car.position.z;_worldMap.helicopterX=_helicopter.position.x;_worldMap.helicopterZ=_helicopter.position.z;
  __weak CityRenderer*weakSelf=self;_worldMap.onClose=^{[weakSelf closeWorldMap];};_worldMap.onTeleport=^(float x,float z,float yaw){[weakSelf teleportFromMapX:x z:z yaw:yaw];};[_view addSubview:_worldMap positioned:NSWindowAbove relativeTo:nil];[_worldMap recenter:nil];[_view.window makeFirstResponder:_worldMap];
}

- (void)closeWorldMap {
  if(!_mapOpen)return;_mapOpen=NO;_worldMap.onClose=nil;_worldMap.onTeleport=nil;[_worldMap removeFromSuperview];_worldMap=nil;[self clearGameInput];[_view.window makeFirstResponder:_view];
}

- (void)teleportFromMapX:(float)x z:(float)z yaw:(float)yaw {
  [self closeWorldMap];_mode=PlayerMode::Walker;_car.speed=0;_car.velocity={0,0,0};_helicopter.speed=0;_helicopter.velocity={0,0,0};
  _pendingTeleport={std::clamp(x,kMapMin+30.f,kMapMax-30.f),.92f,std::clamp(z,kMapMin+30.f,kMapMax-30.f)};_pendingTeleportYaw=yaw;_teleportStartedAt=CACurrentMediaTime();_teleportPending=YES;
  _walker.position=_pendingTeleport;_walker.velocity={0,0,0};_walker.speed=0;_walker.yaw=yaw;_cameraYaw=yaw;_cameraPitch=.12f;_cameraManualTimer=0;_camera=_walker.position+(vector_float3){0,4.5f,6.f};_cameraTarget=_walker.position+(vector_float3){0,1.5f,0};[self showNotice:@"Se pregătesc străzile și coliziunile destinației…"];
}

- (BOOL)insideBuildingAt:(vector_float3)p {
  NSUInteger crossings=0;for(const auto&tile:_tiles)if(tile.state==2&&std::abs(tile.centerX-p.x)<420.f&&std::abs(tile.centerZ-p.z)<420.f)for(const auto&s:tile.collisions){if((s.az>p.z)!=(s.bz>p.z)){float x=s.ax+(p.z-s.az)*(s.bx-s.ax)/(s.bz-s.az);if(x>p.x)crossings++;}}
  return crossings%2==1;
}

- (vector_float3)safeTeleportPoint:(vector_float3)target {
  for(float radius=0;radius<=54;radius+=4.5f){int steps=radius<1?1:std::max(12,(int)std::ceil(radius*.9f));for(int i=0;i<steps;i++){float angle=(float)i/steps*kPi*2.f;vector_float3 p={target.x+std::cos(angle)*radius,.92f,target.z+std::sin(angle)*radius};if(![self blockedAt:p radius:.42f]&&![self insideBuildingAt:p])return p;}}
  return target;
}

- (void)finishPendingTeleport {
  if(!_teleportPending||![self walkerWorldReady])return;_walker.position=[self safeTeleportPoint:_pendingTeleport];_walker.position.y=.92f;_walker.velocity={0,0,0};_walker.yaw=_pendingTeleportYaw;_walker.speed=0;_cameraYaw=_walker.yaw;_camera=_walker.position+(vector_float3){0,3.5f,5.6f};_cameraTarget=_walker.position+(vector_float3){0,1.52f,0};_teleportPending=NO;[self showNotice:@"Ai ajuns la destinație · M pentru hartă"];
}

- (void)enqueueTile:(size_t)index path:(std::string)filePath {
  std::ifstream stream(filePath,std::ios::binary|std::ios::ate);PendingTile ready;ready.index=index;
  if(stream){
    auto size=stream.tellg();
    if(size>=(std::streamoff)sizeof(TileHeader)){
      ready.bytes.resize((size_t)size);stream.seekg(0);stream.read(reinterpret_cast<char*>(ready.bytes.data()),size);
      if(stream){
        auto*h=reinterpret_cast<const TileHeader*>(ready.bytes.data());size_t vertexBytes=(size_t)h->vertexCount*sizeof(PackedVertex),collisionBytes=(size_t)h->collisionCount*sizeof(CollisionSegment);
        if(h->magic==0x4c495443&&h->version==1&&sizeof(TileHeader)+vertexBytes+collisionBytes<=ready.bytes.size()){
          ready.vertexCount=h->vertexCount;ready.collisions.resize(h->collisionCount);
          std::memcpy(ready.collisions.data(),ready.bytes.data()+sizeof(TileHeader)+vertexBytes,collisionBytes);ready.ok=true;
        }
      }
    }
  }
  std::lock_guard<std::mutex>guard(_pendingMutex);_pending.push_back(std::move(ready));
}

- (void)integratePending {
  std::vector<PendingTile> work;{std::lock_guard<std::mutex>guard(_pendingMutex);work.swap(_pending);}
  // Releasing every Metal buffer of an evicted tile in one frame caused a
  // visible 35-45 ms hitch. Retire one chunk at a time and cap total driver
  // operations, keeping both release and upload work bounded.
  int driverOperations=0,baseUploads=0;if(!_retiredChunks.empty()){_retiredChunks.pop_front();driverOperations++;}
  std::vector<PendingTile> deferred;
  for(auto&ready:work){
    if(ready.index>=_tiles.size())continue;auto&tile=_tiles[ready.index];
    if(!ready.ok||ready.bytes.size()<sizeof(TileHeader)){tile.state=0;continue;}
    BOOL detailTile=tile.detail;
    // With the whole base city retained for the no-fog horizon, cap distant
    // base uploads at one per frame. Nearby authored detail may still use the
    // second slot, so buildings along the route finish without a visible pop.
    if(driverOperations>=2||(!detailTile&&baseUploads>=1)){deferred.push_back(std::move(ready));continue;}
    // Two small allocations per frame avoid both a 20 MB main-thread copy and
    // the single 480 KB driver spike while sustaining 28.8 MB/s at 60 FPS.
    // Counts stay triangle-aligned.
    // Dense authored blocks (especially BUC06 and central Șciusev) can make a
    // 480 KB shared-buffer allocation visible as a one-frame hitch. A 240 KB
    // ceiling keeps upload work below the frame budget on Apple Silicon while
    // two background readers continue to prefetch the next tiles.
    constexpr uint32_t maxChunkVertices=6000;
    uint32_t count=std::min(maxChunkVertices,ready.vertexCount-ready.nextVertex);count-=count%3;
    TileBufferChunk chunk;chunk.vertexCount=count;
    chunk.buffer=[_device newBufferWithBytes:ready.bytes.data()+sizeof(TileHeader)+(size_t)ready.nextVertex*sizeof(PackedVertex) length:(size_t)count*sizeof(PackedVertex) options:MTLResourceStorageModeShared];
    driverOperations++;if(!detailTile)baseUploads++;
    if(!chunk.buffer||!count){tile.state=0;continue;}
    ready.chunks.push_back(std::move(chunk));ready.nextVertex+=count;
    if(ready.nextVertex>=ready.vertexCount){
      tile.chunks=std::move(ready.chunks);tile.visibleChunks=0;tile.collisions=std::move(ready.collisions);tile.state=2;
      // A dense authored tile can retain tens of megabytes of source bytes.
      // Destroying that vector here produced a repeatable frame spike when the
      // no-fog streamer reached the denser central pages. Release it away from
      // the render thread after the Metal buffers own their copies.
      auto*retiredBytes=new std::vector<uint8_t>(std::move(ready.bytes));
      dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY,0),^{delete retiredBytes;});
    }else deferred.push_back(std::move(ready));
  }
  if(!deferred.empty()){std::lock_guard<std::mutex>guard(_pendingMutex);for(auto&ready:deferred)_pending.push_back(std::move(ready));}
}

- (PlayerState&)activePlayer { if(_mode==PlayerMode::Car)return _car;if(_mode==PlayerMode::Helicopter)return _helicopter;return _walker; }

- (BOOL)walkerWorldReady {
  float nearest=INFINITY;const TileMeta*selected=nullptr;
  for(const auto&tile:_tiles)if(!tile.detail){float distance=std::hypot(tile.centerX-_walker.position.x,tile.centerZ-_walker.position.z);if(distance<nearest){nearest=distance;selected=&tile;}}
  return selected&&selected->state==2;
}

- (BOOL)blockedAt:(vector_float3)p radius:(float)radius {
  for(const auto&tile:_tiles)if(tile.state==2&&std::abs(tile.centerX-p.x)<560.f&&std::abs(tile.centerZ-p.z)<560.f)for(const auto&b:tile.collisions)if(p.y<b.height+.4f){float combined=radius+b.radius;if(pointSegmentDistanceSquared(p.x,p.z,b)<combined*combined)return YES;}
  return NO;
}

- (BOOL)carBlockedAtX:(float)x z:(float)z yaw:(float)yaw {
  constexpr float halfWidth=.87f,halfLength=2.22f;
  float c=std::cos(yaw),s=std::sin(yaw);
  for(const auto&tile:_tiles)if(tile.state==2&&std::abs(tile.centerX-x)<560.f&&std::abs(tile.centerZ-z)<560.f)for(const auto&b:tile.collisions){
    if(b.height<.12f)continue;
    float adx=b.ax-x,adz=b.az-z,bdx=b.bx-x,bdz=b.bz-z;
    float ax=adx*c-adz*s,az=adx*s+adz*c,bx=bdx*c-bdz*s,bz=bdx*s+bdz*c;
    if(segmentIntersectsRect(ax,az,bx,bz,halfWidth+b.radius,halfLength+b.radius))return YES;
  }
  return NO;
}

- (void)resetActiveVehicle {
  if(_mode==PlayerMode::Car){
    _car=PlayerState{};_car.position={128.f,.72f,-113.f};_car.yaw=0;_carPhysics=CarPhysics{};_cameraYaw=_car.yaw;
  }else if(_mode==PlayerMode::Helicopter){
    _helicopter=PlayerState{};_helicopter.position={108.82f,.05f,-130.06f};_helicopter.yaw=.3f;_heliPhysics=HelicopterPhysics{};_cameraYaw=_helicopter.yaw;
  }
}

- (void)advanceCar:(float)dt forward:(BOOL)forward reverse:(BOOL)reverse steer:(float)steerInput handbrake:(BOOL)handbrake sport:(BOOL)sport {
  float remaining=std::clamp(dt,0.f,.1f);_carPhysics.impact=0;
  while(remaining>1e-6f){
    float h=std::min(remaining,1.f/120.f);remaining-=h;
    float oldSpeed=_car.speed,v=std::abs(_car.speed);
    bool opposing=(forward&&_car.speed<-.15f)||(reverse&&_car.speed>.15f)||(forward&&reverse);
    bool braking=opposing||handbrake;
    float drive=braking?0.f:forward?1.f:reverse?-1.f:0.f;
    float grip=handbrake?5.4f:9.2f;
    float steerLimit=std::min(.62f,std::atan(grip*2.70f/(v*v+4.f)));
    float desiredSteer=-std::clamp(steerInput,-1.f,1.f)*steerLimit;
    _carPhysics.steer=damp(_carPhysics.steer,desiredSteer,14.f,h);
    if(braking){
      _car.speed=moveTowards(_car.speed,0.f,(handbrake?11.5f:8.4f)*h);
    }else if(drive!=0){
      float limit=drive<0?22.f/3.6f:170.f/3.6f;
      if(_car.speed*drive<0){
        _car.speed=moveTowards(_car.speed,0.f,8.4f*h);
      }else{
        float traction=drive<0?2.7f:std::min(sport?4.4f:3.8f,(sport?82000.f:71000.f)/(1325.f*std::max(v,5.f)));
        float taper=std::clamp((limit-v)*1.25f,0.f,1.f);
        float drag=v>.015f?.10f+.00027f*v*v:0.f;
        float next=std::clamp(v+(traction*taper-drag)*h,0.f,limit);
        _car.speed=next*drive;
      }
    }else{
      float coast=v>.015f?.30f+.0022f*v*v:0.f;
      _car.speed=moveTowards(_car.speed,0.f,coast*h);
    }
    float turn=_car.speed*std::tan(_carPhysics.steer)/2.70f*h;
    float nextYaw=_car.yaw+turn,midYaw=_car.yaw+turn*.5f;
    float nx=_car.position.x-std::sin(midYaw)*_car.speed*h,nz=_car.position.z-std::cos(midYaw)*_car.speed*h;
    if([self carBlockedAtX:nx z:nz yaw:nextYaw]){
      _carPhysics.impact=std::max(_carPhysics.impact,v);_car.speed=0;_car.velocity={0,0,0};
    }else{
      _car.position.x=nx;_car.position.z=nz;_car.yaw=nextYaw;_carPhysics.distance+=std::abs(_car.speed)*h;
      _car.velocity={-std::sin(_car.yaw)*_car.speed,0,-std::cos(_car.yaw)*_car.speed};
    }
    _carPhysics.acceleration=std::clamp((_car.speed-oldSpeed)/h,-12.f,6.f);
    _carPhysics.braking=braking;_carPhysics.reversing=_car.speed<-.05f||reverse&&v<.2f;_carPhysics.handbrake=handbrake;
    float lateral=_car.speed*_car.speed*std::tan(_carPhysics.steer)/2.70f;
    _carPhysics.bodyRoll=damp(_carPhysics.bodyRoll,std::clamp(-lateral*.0032f,-.025f,.025f),7.f,h);
    _carPhysics.bodyPitch=damp(_carPhysics.bodyPitch,std::clamp(-_carPhysics.acceleration*.0028f,-.022f,.028f),8.f,h);
  }
  _car.position.y=.72f;
}

- (void)advanceHelicopter:(float)dt forward:(float)forwardInput strafe:(float)strafeInput turn:(float)turnInput vertical:(float)verticalInput boost:(BOOL)boost {
  float remaining=std::clamp(dt,0.f,.1f);_heliPhysics.contact=false;
  while(remaining>1e-6f){
    float h=std::min(remaining,1.f/120.f);remaining-=h;
    _heliPhysics.rotor=damp(_heliPhysics.rotor,1.f,1.8f,h);
    bool powered=_heliPhysics.rotor>.72f;
    if(_heliPhysics.grounded){
      _helicopter.position.y=.05f;_helicopter.velocity={0,0,0};
      if(verticalInput>.05f&&powered){_heliPhysics.grounded=false;_helicopter.position.y=.065f;_helicopter.velocity.y=.65f;}
    }
    bool flying=!_heliPhysics.grounded;
    float maxSpeed=boost?38.f:25.f;
    float forwardSpeed=maxSpeed*std::clamp(forwardInput,-1.f,1.f)*(forwardInput<0?.55f:1.f);
    float sideSpeed=maxSpeed*.62f*std::clamp(strafeInput,-1.f,1.f);
    float yawTarget=flying?-std::clamp(turnInput,-1.f,1.f)*1.15f:0.f;
    _heliPhysics.yawRate=damp(_heliPhysics.yawRate,yawTarget,4.2f,h);
    float nextYaw=_helicopter.yaw+_heliPhysics.yawRate*h;
    vector_float3 f={-std::sin(nextYaw),0,-std::cos(nextYaw)},r={std::cos(nextYaw),0,-std::sin(nextYaw)};
    vector_float3 desired=f*forwardSpeed+r*sideSpeed;
    float response=(std::abs(forwardInput)+std::abs(strafeInput)>.02f)?2.2f:3.6f;
    _helicopter.velocity.x=damp(_helicopter.velocity.x,flying&&powered?desired.x:0.f,response,h);
    _helicopter.velocity.z=damp(_helicopter.velocity.z,flying&&powered?desired.z:0.f,response,h);
    if(flying){
      float verticalTarget=verticalInput>.05f?9.f:verticalInput<-.05f?-6.f:0.f;
      if(!powered)verticalTarget=-5.f;
      _helicopter.velocity.y=damp(_helicopter.velocity.y,verticalTarget,powered?2.6f:1.2f,h);
    }
    vector_float3 old=_helicopter.position,next=old+_helicopter.velocity*h;next.y=std::clamp(next.y,.05f,320.f);
    vector_float3 horizontal={next.x,old.y,next.z};
    if(flying&&[self blockedAt:horizontal radius:2.1f]){
      _helicopter.velocity.x*=-.12f;_helicopter.velocity.z*=-.12f;_heliPhysics.contact=true;
      next.x=old.x;next.z=old.z;
    }
    _helicopter.position=next;_helicopter.yaw=nextYaw;
    if(_helicopter.position.y<=.0501f&&_helicopter.velocity.y<=0){
      _helicopter.position.y=.05f;_helicopter.velocity={0,0,0};_heliPhysics.grounded=true;
    }
    if(_helicopter.position.y>=319.99f&&_helicopter.velocity.y>0)_helicopter.velocity.y=0;
    _heliPhysics.pitch=damp(_heliPhysics.pitch,flying?-.12f*std::clamp(forwardInput,-1.f,1.f):0.f,5.f,h);
    _heliPhysics.bank=damp(_heliPhysics.bank,flying?-.09f*std::clamp(strafeInput,-1.f,1.f)-.05f*std::clamp(turnInput,-1.f,1.f):0.f,5.f,h);
    _rotorAngle+=h*_heliPhysics.rotor*30.f;
  }
  _helicopter.speed=std::hypot(_helicopter.velocity.x,_helicopter.velocity.z);
}

- (void)showNotice:(NSString*)text {
  _notice.stringValue=text;_noticeUntil=CACurrentMediaTime()+3.4;
}

- (vector_float3)localPointFor:(const PlayerState&)vehicle x:(float)x z:(float)z y:(float)y {
  float c=std::cos(vehicle.yaw),s=std::sin(vehicle.yaw);
  return {vehicle.position.x+x*c+z*s,y,vehicle.position.z-x*s+z*c};
}

- (BOOL)spawnCarNearWalker {
  if(_mode!=PlayerMode::Walker||![self walkerWorldReady]){[self showNotice:@"Așteaptă încărcarea străzii înainte de a genera mașina."];return NO;}
  PlayerState anchor=_walker;anchor.yaw=_cameraYaw;
  static const float candidates[][2]={{0,-7},{3.4f,-7},{-3.4f,-7},{0,7},{5.5f,0},{-5.5f,0},{0,-12},{7,-7},{-7,-7}};
  for(const auto&offset:candidates){
    vector_float3 point=[self localPointFor:anchor x:offset[0] z:offset[1] y:.72f];
    if([self carBlockedAtX:point.x z:point.z yaw:anchor.yaw]||[self insideBuildingAt:point]||std::hypot(point.x-_helicopter.position.x,point.z-_helicopter.position.z)<6.5f)continue;
    _car=PlayerState{};_car.position=point;_car.yaw=anchor.yaw;_carPhysics=CarPhysics{};
    [self showNotice:@"Mașină generată · apropie-te și apasă E"];
    return YES;
  }
  [self showNotice:@"Nu există suficient spațiu liber aici pentru mașină."];
  return NO;
}

- (BOOL)spawnHelicopterNearWalker {
  if(_mode!=PlayerMode::Walker||![self walkerWorldReady]){[self showNotice:@"Așteaptă încărcarea străzii înainte de a genera elicopterul."];return NO;}
  PlayerState anchor=_walker;anchor.yaw=_cameraYaw;
  static const float candidates[][2]={{0,-12},{7,-12},{-7,-12},{12,0},{-12,0},{0,12},{11,-11},{-11,-11},{0,-20}};
  for(const auto&offset:candidates){
    vector_float3 point=[self localPointFor:anchor x:offset[0] z:offset[1] y:.05f];
    if([self blockedAt:point radius:3.35f]||[self insideBuildingAt:point]||std::hypot(point.x-_car.position.x,point.z-_car.position.z)<7.5f)continue;
    _helicopter=PlayerState{};_helicopter.position=point;_helicopter.yaw=anchor.yaw;_heliPhysics=HelicopterPhysics{};
    [self showNotice:@"Elicopter generat · apropie-te și apasă E"];
    return YES;
  }
  [self showNotice:@"Nu există suficient spațiu liber aici pentru elicopter."];
  return NO;
}

- (BOOL)enterCarIfNear:(BOOL)explain {
  if(std::hypot(_walker.position.x-_car.position.x,_walker.position.z-_car.position.z)>4.8f){if(explain)[self showNotice:@"Apropie-te de mașină, apoi apasă E."];return NO;}
  _mode=PlayerMode::Car;_car.speed=0;_car.velocity={0,0,0};_cameraYaw=_car.yaw;_cameraPitch=.12f;_cameraManualTimer=0;
  [self showNotice:@"Ai intrat în mașină · E pentru coborâre"];
  return YES;
}

- (BOOL)enterHelicopterIfNear:(BOOL)explain {
  float distance=std::hypot(_walker.position.x-_helicopter.position.x,_walker.position.z-_helicopter.position.z);
  if(!_heliPhysics.grounded||distance>9.f){if(explain)[self showNotice:_heliPhysics.grounded?@"Apropie-te de elicopter, apoi apasă E.":@"Elicopterul trebuie să fie aterizat."];return NO;}
  _mode=PlayerMode::Helicopter;_cameraYaw=_helicopter.yaw;_cameraPitch=.14f;_cameraManualTimer=0;
  [self showNotice:@"Ai intrat în elicopter · E pentru coborâre după aterizare"];
  return YES;
}

- (BOOL)exitActiveVehicle {
  if(_mode==PlayerMode::Walker)return YES;
  if(_mode==PlayerMode::Helicopter&&!_heliPhysics.grounded){[self showNotice:@"Aterizează elicopterul înainte de a coborî."];return NO;}
  static const float carCandidates[][2]={{-1.65f,-.25f},{1.65f,-.25f},{-1.75f,1.45f},{1.75f,1.45f},{0,3.25f}};
  static const float heliCandidates[][2]={{-3.0f,-2.f},{3.0f,-2.f},{-3.7f,0},{3.7f,0},{0,-6.3f}};
  const PlayerState&vehicle=_mode==PlayerMode::Car?_car:_helicopter;
  const float(*candidates)[2]=_mode==PlayerMode::Car?carCandidates:heliCandidates;
  int count=5;vector_float3 point{};BOOL found=NO;
  for(int i=0;i<count;i++){
    vector_float3 candidate=[self localPointFor:vehicle x:candidates[i][0] z:candidates[i][1] y:.92f];
    if(![self blockedAt:candidate radius:.34f]){point=candidate;found=YES;break;}
  }
  if(!found){[self showNotice:@"Nu este loc sigur pentru coborâre. Mută vehiculul puțin."];return NO;}
  if(_mode==PlayerMode::Car){_car.speed=0;_car.velocity={0,0,0};_carPhysics.steer=0;}
  else {_helicopter.velocity={0,0,0};_helicopter.speed=0;}
  _walker.position=point;_walker.velocity={0,0,0};_walker.yaw=vehicle.yaw;_walker.speed=0;
  _mode=PlayerMode::Walker;_cameraYaw=_walker.yaw;_cameraPitch=.12f;_cameraManualTimer=0;
  [self showNotice:@"Ai coborât · E lângă un vehicul pentru a intra"];
  return YES;
}

- (void)interactWithVehicle {
  if(_mode!=PlayerMode::Walker){[self exitActiveVehicle];return;}
  float carDistance=std::hypot(_walker.position.x-_car.position.x,_walker.position.z-_car.position.z);
  float heliDistance=std::hypot(_walker.position.x-_helicopter.position.x,_walker.position.z-_helicopter.position.z);
  if(_heliPhysics.grounded&&heliDistance<=9.f&&heliDistance<carDistance){[self enterHelicopterIfNear:YES];return;}
  if(carDistance<=4.8f){[self enterCarIfNear:YES];return;}
  if(_heliPhysics.grounded&&heliDistance<=9.f){[self enterHelicopterIfNear:YES];return;}
  [self showNotice:@"Apropie-te de mașină sau de elicopter, apoi apasă E."];
}

- (void)updatePlayer:(float)dt now:(double)now {
  if(_benchmarkKind==7){
    float elapsed=(float)(now-_benchmarkStart);if(!_mapTestOpened&&elapsed>.25f){[self openWorldMap];_mapTestOpened=_worldMap!=nil;}
    if(_mapTestOpened&&!_mapTestTeleported&&elapsed>.85f){vector_float2 destination=nativeMapPoint(1310.f,-355.5f);[self teleportFromMapX:destination.x z:destination.y yaw:-2.342f];_mapTestTeleported=YES;}
  }
  if(_benchmarkKind==11&&[self walkerWorldReady]){
    if(!_spawnTestCar)_spawnTestCar=[self spawnCarNearWalker];
    if(_spawnTestCar&&!_spawnTestHelicopter)_spawnTestHelicopter=[self spawnHelicopterNearWalker];
  }
  if(!_benchmark){
    if([_view pressed:46]){[self openWorldMap];return;}
    if([_view pressed:14])[self interactWithVehicle];
    if([_view pressed:18]&&_mode!=PlayerMode::Walker)[self exitActiveVehicle];
    if([_view pressed:19]&&_mode==PlayerMode::Walker)[self spawnCarNearWalker];
    if([_view pressed:20]&&_mode==PlayerMode::Walker)[self spawnHelicopterNearWalker];
    if([_view pressed:15])[self resetActiveVehicle];
  }
  [self finishPendingTeleport];
  if(_mapOpen||_teleportPending){_walker.velocity={0,0,0};_walker.speed=0;_car.velocity={0,0,0};_helicopter.velocity={0,0,0};return;}
  if(std::abs(_view->_mouseDX)>.01f||std::abs(_view->_mouseDY)>.01f)_cameraManualTimer=1.6f;else _cameraManualTimer=std::max(0.f,_cameraManualTimer-dt);
  _cameraYaw-=_view->_mouseDX*.0026f;_cameraPitch=std::clamp(_cameraPitch+_view->_mouseDY*.0021f,-.32f,.72f);
  bool w=[_view isDown:13],s=[_view isDown:1],a=[_view isDown:0],d=[_view isDown:2],space=[_view isDown:49],ctrl=[_view isDown:59]||[_view isDown:62],shift=[_view isDown:56]||[_view isDown:60];
  if(_benchmarkKind==6){float t=(float)(now-_benchmarkStart);w=t>=2.f&&t<7.f;d=t>=4.5f&&t<7.f;shift=t>=4.5f&&t<7.f;s=a=false;}
  if(_benchmarkKind==3){
    float t=(float)(now-_benchmarkStart);
    if(_interactionStage==0&&t>.25f){_walker.position={_car.position.x+2.f,.92f,_car.position.z};_interactionCarEntry=[self enterCarIfNear:NO]&&_mode==PlayerMode::Car;_interactionStage++;}
    if(_interactionStage==1&&t>.75f){_interactionCarExit=[self exitActiveVehicle]&&_mode==PlayerMode::Walker;_interactionStage++;}
    if(_interactionStage==2&&t>1.25f){_walker.position={_helicopter.position.x+3.f,.92f,_helicopter.position.z};_interactionHeliEntry=[self enterHelicopterIfNear:NO]&&_mode==PlayerMode::Helicopter;_interactionStage++;}
    if(_interactionStage==3&&t>1.75f){_interactionHeliExit=[self exitActiveVehicle]&&_mode==PlayerMode::Walker;_interactionStage++;}
  }
  if(isHelicopterBenchmark(_benchmarkKind)){
    float t=(float)(now-_benchmarkStart),turn=t<8.f?0.f:.18f;
    [self advanceHelicopter:dt forward:1.f strafe:0 turn:turn vertical:0 boost:YES];
    if(t<8.f){vector_float2 start=helicopterBenchmarkStart(_benchmarkKind);float heading=helicopterBenchmarkHeading(_benchmarkKind),dx=_helicopter.position.x-start.x,dz=_helicopter.position.z-start.y,rightX=std::cos(heading),rightZ=-std::sin(heading);_heliStraightMaxDeviation=std::max(_heliStraightMaxDeviation,std::abs(dx*rightX+dz*rightZ));}
    _cameraYaw=_helicopter.yaw;_cameraPitch=.16f;
  } else if(_benchmarkKind==2){
    float t=(float)(now-_benchmarkStart),steer=t<4.f?0.f:std::sin((t-4.f)*.38f)*.72f;BOOL forward=t<9.f||(t>=16.f&&t<20.f),reverse=t>=9.f&&t<16.f,handbrake=t>=20.f;
    [self advanceCar:dt forward:forward reverse:reverse steer:steer handbrake:handbrake sport:YES];
    if(t<4.f)_carStraightMaxDeviation=std::max(_carStraightMaxDeviation,std::abs(_car.position.x-128.f));
    _carBenchmarkMaxForward=std::max(_carBenchmarkMaxForward,_car.speed);_carBenchmarkMaxReverse=std::min(_carBenchmarkMaxReverse,_car.speed);if(_car.speed<-.5f)_carBenchmarkReversed=YES;
    _cameraYaw=_car.yaw;_cameraPitch=.12f;
  } else if(_mode==PlayerMode::Walker){
    vector_float3 walkerBefore=_walker.position;
    float forward=(w?1.f:0.f)-(s?1.f:0.f),side=(d?1.f:0.f)-(a?1.f:0.f),speed=shift?7.f:3.25f;
    vector_float3 f={-std::sin(_cameraYaw),0,-std::cos(_cameraYaw)},r={std::cos(_cameraYaw),0,-std::sin(_cameraYaw)},move=f*forward+r*side;if(simd_length(move)>.01f)move=simd_normalize(move)*speed;
    if(![self walkerWorldReady])move={0,0,0};
    _walker.velocity=move;float remaining=std::clamp(dt,0.f,.1f);
    while(remaining>1e-6f){float h=std::min(remaining,1.f/90.f);remaining-=h;
      vector_float3 next=_walker.position;next.x+=_walker.velocity.x*h;if([self blockedAt:next radius:.30f])_walker.velocity.x=0;else _walker.position.x=next.x;
      next=_walker.position;next.z+=_walker.velocity.z*h;if([self blockedAt:next radius:.30f])_walker.velocity.z=0;else _walker.position.z=next.z;
    }
    _walker.position.y=.92f;_walker.speed=std::hypot(_walker.velocity.x,_walker.velocity.z);
    if(_walker.speed>.02f){float target=std::atan2(_walker.velocity.x,_walker.velocity.z),difference=std::atan2(std::sin(target-_walker.yaw),std::cos(target-_walker.yaw));_walker.yaw+=difference*std::min(1.f,dt*12.f);_walkerFacingError=std::abs(std::atan2(std::sin(target-_walker.yaw),std::cos(target-_walker.yaw)));_walkerAnimationPhase+=dt*(_walker.speed>4.f?1.45f:1.05f);}
    if(_benchmarkKind==6)_walkerTestDistance+=std::hypot(_walker.position.x-walkerBefore.x,_walker.position.z-walkerBefore.z);
  } else if(_mode==PlayerMode::Car){
    [self advanceCar:dt forward:w reverse:s steer:(d?1.f:0.f)-(a?1.f:0.f) handbrake:space sport:shift];
    if(!_view->_mouseCaptured||_cameraManualTimer<=0)_cameraYaw=mix(_cameraYaw,_car.yaw,1-std::exp(-dt*2.8f));
  } else {
    float forward=(w?1.f:0.f)-(s?1.f:0.f),turn=(d?1.f:0.f)-(a?1.f:0.f),vertical=(space?1.f:0.f)-(ctrl?1.f:0.f);
    [self advanceHelicopter:dt forward:forward strafe:0 turn:turn vertical:vertical boost:shift];
    if(!_view->_mouseCaptured||_cameraManualTimer<=0)_cameraYaw=mix(_cameraYaw,_helicopter.yaw,1-std::exp(-dt*2.f));
  }
  if(_mode!=PlayerMode::Helicopter&&_heliPhysics.grounded)_heliPhysics.rotor=damp(_heliPhysics.rotor,0.f,1.2f,dt);
}

- (void)updateCamera:(float)dt {
  PlayerState&p=[self activePlayer];float sp=std::sin(_cameraPitch),distance;vector_float3 target,desired;
  if(_mode==PlayerMode::Walker){
    distance=5.6f;target=p.position+(vector_float3){0,1.52f,0};
    desired={p.position.x+std::sin(_cameraYaw)*distance,p.position.y+2.60f+sp*distance,p.position.z+std::cos(_cameraYaw)*distance};
  }else if(_mode==PlayerMode::Car){
    distance=6.7f+std::min(std::abs(p.speed)*.035f,1.3f);target=p.position+(vector_float3){0,1.05f,0};
    desired={p.position.x+std::sin(_cameraYaw)*distance,p.position.y+2.65f+sp*4.f,p.position.z+std::cos(_cameraYaw)*distance};
  }else{
    distance=15.f+std::min(p.speed*.1f,3.f);target=p.position+(vector_float3){0,1.7f,0};
    desired={p.position.x+std::sin(_cameraYaw)*distance,p.position.y+5.8f+sp*10.f,p.position.z+std::cos(_cameraYaw)*distance};
  }
  float alpha=1-(float)std::exp(-dt*(_mode==PlayerMode::Helicopter?4.2f:7.f));_camera=_camera+(desired-_camera)*alpha;_cameraTarget=_cameraTarget+(target-_cameraTarget)*alpha;
  _fogEnd=kNoFogViewDistance;_fogStart=kNoFogViewDistance;
}

- (void)updateStreaming:(double)now {
  PlayerState&p=[self activePlayer];float lookAhead=_mode==PlayerMode::Helicopter?6.5f:4.5f;vector_float3 forecast=p.position+p.velocity*lookAhead;float worldRadius=kNoFogViewDistance;
  int baseLoading=0,detailLoading=0;std::vector<std::pair<float,size_t>>baseCandidates,detailCandidates;
  for(size_t i=0;i<_tiles.size();i++){
    auto&t=_tiles[i];float radius=t.detail?(_mode==PlayerMode::Helicopter?900.f:700.f):worldRadius,evict=radius+(t.detail?320.f:850.f);float current=std::hypot(t.centerX-p.position.x,t.centerZ-p.position.z),ahead=std::hypot(t.centerX-forecast.x,t.centerZ-forecast.z),priority=std::min(current,ahead*(t.detail?.72f:.78f));
    if(priority<radius)t.lastNear=now;if(t.state==1){if(t.detail)detailLoading++;else baseLoading++;}
    if(t.state==0&&priority<radius)(t.detail?detailCandidates:baseCandidates).push_back({priority,i});
    if(t.state==2&&current>evict&&now-t.lastNear>8){for(auto&chunk:t.chunks)_retiredChunks.push_back(std::move(chunk));t.chunks.clear();t.visibleChunks=0;t.collisions.clear();t.state=0;}
  }
  std::sort(baseCandidates.begin(),baseCandidates.end());std::sort(detailCandidates.begin(),detailCandidates.end());
  int baseSlots=std::max(0,2-baseLoading);for(int n=0;n<baseSlots&&n<(int)baseCandidates.size();n++){
    size_t index=baseCandidates[n].second;_tiles[index].state=1;std::string file=_tiles[index].path;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED,0),^{[self enqueueTile:index path:file];});
  }
  int detailSlots=std::max(0,2-detailLoading);for(int n=0;n<detailSlots&&n<(int)detailCandidates.size();n++){
    size_t index=detailCandidates[n].second;_tiles[index].state=1;std::string file=_tiles[index].path;
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED,0),^{[self enqueueTile:index path:file];});
  }
}

- (void)drawCube:(id<MTLRenderCommandEncoder>)encoder vp:(matrix_float4x4)vp camera:(vector_float3)camera position:(vector_float3)position size:(vector_float3)size yaw:(float)yaw color:(vector_float3)color time:(float)time {
  Uniforms u;u.viewProjection=vp;u.model=simd_mul(translation(position.x,position.y,position.z),simd_mul(rotationY(yaw),scaleMatrix(size.x,size.y,size.z)));
  u.cameraAndFogStart={camera.x,camera.y,camera.z,_fogStart};u.fogEndAndSun={_fogEnd,-85.f,110.f,65.f};u.tintAndTime={color.x,color.y,color.z,-1};u.viewportAndExposure={(float)_view.drawableSize.width,(float)_view.drawableSize.height,1,0};
  [encoder setVertexBuffer:_cube offset:0 atIndex:0];[encoder setVertexBytes:&u length:sizeof(u) atIndex:1];[encoder setFragmentBytes:&u length:sizeof(u) atIndex:1];[encoder drawPrimitives:MTLPrimitiveTypeTriangle vertexStart:0 vertexCount:_cubeCount];
}

- (void)drawCubeTransform:(id<MTLRenderCommandEncoder>)encoder vp:(matrix_float4x4)vp transform:(matrix_float4x4)transform color:(vector_float3)color {
  Uniforms u;u.viewProjection=vp;u.model=transform;u.cameraAndFogStart={_camera.x,_camera.y,_camera.z,_fogStart};u.fogEndAndSun={_fogEnd,-85.f,110.f,65.f};u.tintAndTime={color.x,color.y,color.z,-1};u.viewportAndExposure={(float)_view.drawableSize.width,(float)_view.drawableSize.height,1,0};
  [encoder setVertexBuffer:_cube offset:0 atIndex:0];[encoder setVertexBytes:&u length:sizeof(u) atIndex:1];[encoder setFragmentBytes:&u length:sizeof(u) atIndex:1];[encoder drawPrimitives:MTLPrimitiveTypeTriangle vertexStart:0 vertexCount:_cubeCount];
}

- (void)drawModel:(const ModelMesh&)mesh encoder:(id<MTLRenderCommandEncoder>)encoder vp:(matrix_float4x4)vp position:(vector_float3)position yaw:(float)yaw pitch:(float)pitch roll:(float)roll tint:(vector_float3)tint {
  if(!mesh.buffer||!mesh.vertexCount)return;Uniforms u;u.viewProjection=vp;u.model=simd_mul(translation(position.x,position.y,position.z),simd_mul(rotationY(yaw),simd_mul(rotationX(pitch),rotationZ(roll))));u.cameraAndFogStart={_camera.x,_camera.y,_camera.z,_fogStart};u.fogEndAndSun={_fogEnd,-85.f,110.f,65.f};u.tintAndTime={tint.x,tint.y,tint.z,-1};u.viewportAndExposure={(float)_view.drawableSize.width,(float)_view.drawableSize.height,1,0};
  [encoder setVertexBuffer:mesh.buffer offset:0 atIndex:0];[encoder setVertexBytes:&u length:sizeof(u) atIndex:1];[encoder setFragmentBytes:&u length:sizeof(u) atIndex:1];[encoder drawPrimitives:MTLPrimitiveTypeTriangle vertexStart:0 vertexCount:mesh.vertexCount];
}

- (void)drawActors:(id<MTLRenderCommandEncoder>)encoder vp:(matrix_float4x4)vp time:(float)time {
  if(_priusModel.buffer)[self drawModel:_priusModel encoder:encoder vp:vp position:_car.position+(vector_float3){0,-.72f,0} yaw:_car.yaw pitch:_carPhysics.bodyPitch roll:_carPhysics.bodyRoll tint:{1,1,1}];else{
    [self drawCube:encoder vp:vp camera:_camera position:_car.position+(vector_float3){0,.25f,0} size:{1.85f,.55f,4.15f} yaw:_car.yaw color:{.72f,.12f,.08f} time:time];
    [self drawCube:encoder vp:vp camera:_camera position:_car.position+(vector_float3){0,.78f,.1f} size:{1.48f,.62f,2.05f} yaw:_car.yaw color:{.62f,.72f,.75f} time:time];
  }
  vector_float3 hp=_helicopter.position;
  vector_float3 forward={-std::sin(_helicopter.yaw),0,-std::cos(_helicopter.yaw)};
  if(_helicopterModel.buffer)[self drawModel:_helicopterModel encoder:encoder vp:vp position:hp yaw:_helicopter.yaw pitch:_heliPhysics.pitch roll:_heliPhysics.bank tint:{1,1,1}];else{[self drawCube:encoder vp:vp camera:_camera position:hp size:{2.4f,2.2f,4.4f} yaw:_helicopter.yaw color:{.18f,.30f,.72f} time:time];[self drawCube:encoder vp:vp camera:_camera position:hp-forward*3.7f+(vector_float3){0,.25f,0} size:{.72f,.72f,5.5f} yaw:_helicopter.yaw color:{.88f,.90f,.92f} time:time];}
  matrix_float4x4 heliBody=simd_mul(translation(hp.x,hp.y,hp.z),simd_mul(rotationY(_helicopter.yaw),simd_mul(rotationX(_heliPhysics.pitch),rotationZ(_heliPhysics.bank))));
  matrix_float4x4 rotorBase=simd_mul(heliBody,simd_mul(translation(0,3.2f,0),rotationY(_rotorAngle)));
  [self drawCubeTransform:encoder vp:vp transform:simd_mul(rotorBase,scaleMatrix(11.f,.075f,.18f)) color:{.10f,.10f,.10f}];
  [self drawCubeTransform:encoder vp:vp transform:simd_mul(rotorBase,scaleMatrix(.18f,.075f,11.f)) color:{.10f,.10f,.10f}];
  if(_mode==PlayerMode::Walker){
    vector_float3 wp=_walker.position;
    const ModelMesh*walkerVisual=&_walkerModel;if(_walker.speed>.02f){size_t frame=(size_t)std::floor(_walkerAnimationPhase*8.f)%8;const ModelMesh&animated=_walker.speed>4.f?_walkerRunFrames[frame]:_walkerWalkFrames[frame];if(animated.buffer)walkerVisual=&animated;}
    if(walkerVisual->buffer)[self drawModel:*walkerVisual encoder:encoder vp:vp position:wp+(vector_float3){0,-.92f,0} yaw:_walker.yaw pitch:0 roll:0 tint:{1,1,1}];else{[self drawCube:encoder vp:vp camera:_camera position:wp+(vector_float3){0,.45f,0} size:{.6f,.9f,.38f} yaw:_walker.yaw color:{.12f,.28f,.55f} time:time];[self drawCube:encoder vp:vp camera:_camera position:wp+(vector_float3){0,1.12f,0} size:{.42f,.42f,.42f} yaw:_walker.yaw color:{.72f,.55f,.42f} time:time];}
  }
}

- (void)updateHUD:(double)now {
  if(now-_lastHUD<.12)return;_lastHUD=now;PlayerState&p=[self activePlayer];NSString*mode=_mode==PlayerMode::Walker?@"PIETON":_mode==PlayerMode::Car?@"MAȘINĂ":@"ELICOPTER";
  int loaded=0,loading=0;for(const auto&t:_tiles){if(t.state==2)loaded++;else if(t.state==1)loading++;}
  float kmh=std::abs(p.speed)*3.6f;NSString*state=@"";
  if(_mode==PlayerMode::Car)state=_carPhysics.reversing?@"R":_carPhysics.braking?@"FRÂNĂ":@"D";
  else if(_mode==PlayerMode::Helicopter)state=_heliPhysics.grounded?(_heliPhysics.rotor>.72f?@"ROTOR GATA":@"PORNIRE ROTOR"):@"ÎN ZBOR";
  _hud.stringValue=[NSString stringWithFormat:@"CHIȘINĂU 3D · METAL NATIV\n%@ · %@ · %.0f km/h · alt. %.0f m\n%.0f FPS · %d/%zu sectoare · %d pregătite",mode,state,kmh,p.position.y,_displayFPS,loaded,_tiles.size(),loading];
  if(_mode==PlayerMode::Walker)_controls.stringValue=@"WASD deplasare · Shift alergare · M hartă/teleport · E intră · 2 generează mașină · 3 generează elicopter · Esc cursor";
  else if(_mode==PlayerMode::Car)_controls.stringValue=@"W accelerează · S frână/marșarier · A/D direcție · Space frână de mână · M hartă · E/1 coboară · R repoziționează";
  else _controls.stringValue=@"W/S înainte/înapoi · A/D rotație · Space urcare · Ctrl coborâre · Shift boost · M hartă · E/1 coboară · R repoziționează";
  if(!_benchmark&&now>=_noticeUntil)_notice.stringValue=_teleportPending?@"Se pregătesc străzile și coliziunile destinației…":[self walkerWorldReady]?@"M hartă · E intră / iese · clic pe mini-hartă":@"Se pregătesc strada și coliziunile din apropiere…";
  _minimap.worldX=p.position.x;_minimap.worldZ=p.position.z;_minimap.heading=p.yaw;_minimap.loadedTiles=loaded;[_minimap setNeedsDisplay:YES];
  if(_worldMap){_worldMap.playerX=p.position.x;_worldMap.playerZ=p.position.z;_worldMap.heading=p.yaw;_worldMap.carX=_car.position.x;_worldMap.carZ=_car.position.z;_worldMap.helicopterX=_helicopter.position.x;_worldMap.helicopterZ=_helicopter.position.z;[_worldMap setNeedsDisplay:YES];}
}

- (void)finishBenchmark:(double)now {
  if(!_benchmark||_benchmarkFinished)return;
  if(_benchmarkKind==3){
    if(now-_benchmarkStart<2.25)return;_benchmarkFinished=YES;
    BOOL passed=_interactionCarEntry&&_interactionCarExit&&_interactionHeliEntry&&_interactionHeliExit&&_mode==PlayerMode::Walker;
    std::ostringstream out;out<<"{\n  \"test\": \"vehicle interaction\",\n  \"car_entry\": "<<(_interactionCarEntry?"true":"false")<<",\n  \"car_exit\": "<<(_interactionCarExit?"true":"false")<<",\n  \"helicopter_entry\": "<<(_interactionHeliEntry?"true":"false")<<",\n  \"helicopter_exit_after_landing\": "<<(_interactionHeliExit?"true":"false")<<",\n  \"walker_restored\": "<<(_mode==PlayerMode::Walker?"true":"false")<<",\n  \"passed\": "<<(passed?"true":"false")<<"\n}\n";
    std::ofstream("/tmp/chisinau-native-interaction.json")<<out.str();std::cout<<out.str()<<std::flush;dispatch_async(dispatch_get_main_queue(),^{[NSApp terminate:nil];});return;
  }
  if(_benchmarkKind==6){
    if(now-_benchmarkStart<8.25)return;_benchmarkFinished=YES;int animationFrames=0;for(const auto&frame:_walkerWalkFrames)if(frame.buffer)animationFrames++;for(const auto&frame:_walkerRunFrames)if(frame.buffer)animationFrames++;
    BOOL finite=std::isfinite(_walker.position.x)&&std::isfinite(_walker.position.z)&&std::isfinite(_walker.yaw),passed=finite&&_walkerTestDistance>8.f&&_walkerFacingError<.08f&&animationFrames==16;
    std::ostringstream out;out<<"{\n  \"test\": \"walker physics and animation\",\n  \"distance_m\": "<<std::fixed<<std::setprecision(2)<<_walkerTestDistance<<",\n  \"facing_error_rad\": "<<_walkerFacingError<<",\n  \"animation_frames_loaded\": "<<animationFrames<<",\n  \"finite_state\": "<<(finite?"true":"false")<<",\n  \"passed\": "<<(passed?"true":"false")<<"\n}\n";
    std::ofstream("/tmp/chisinau-native-walker.json")<<out.str();std::cout<<out.str()<<std::flush;dispatch_async(dispatch_get_main_queue(),^{[NSApp terminate:nil];});return;
  }
  if(_benchmarkKind==7){
    if(now-_benchmarkStart<10.25)return;_benchmarkFinished=YES;vector_float2 expected=nativeMapPoint(1310.f,-355.5f);float error=std::hypot(_walker.position.x-expected.x,_walker.position.z-expected.y);BOOL asset=std::filesystem::exists(std::filesystem::path(_resourcePath.UTF8String)/"map/world-map.png"),passed=asset&&_mapTestOpened&&_mapTestTeleported&&!_teleportPending&&error<60.f&&_mode==PlayerMode::Walker;
    std::ostringstream out;out<<"{\n  \"test\": \"offline map and teleport\",\n  \"map_asset_loaded\": "<<(asset?"true":"false")<<",\n  \"map_opened\": "<<(_mapTestOpened?"true":"false")<<",\n  \"teleport_requested\": "<<(_mapTestTeleported?"true":"false")<<",\n  \"destination_ready\": "<<(!_teleportPending?"true":"false")<<",\n  \"destination_error_m\": "<<std::fixed<<std::setprecision(2)<<error<<",\n  \"walker_mode_restored\": "<<(_mode==PlayerMode::Walker?"true":"false")<<",\n  \"passed\": "<<(passed?"true":"false")<<"\n}\n";
    std::ofstream("/tmp/chisinau-native-map.json")<<out.str();std::cout<<out.str()<<std::flush;dispatch_async(dispatch_get_main_queue(),^{[NSApp terminate:nil];});return;
  }
  if(_benchmarkKind==11){
    if(now-_benchmarkStart<6.25)return;_benchmarkFinished=YES;
    float carDistance=std::hypot(_car.position.x-_walker.position.x,_car.position.z-_walker.position.z),helicopterDistance=std::hypot(_helicopter.position.x-_walker.position.x,_helicopter.position.z-_walker.position.z),vehicleDistance=std::hypot(_car.position.x-_helicopter.position.x,_car.position.z-_helicopter.position.z);
    BOOL finite=std::isfinite(_car.position.x)&&std::isfinite(_car.position.z)&&std::isfinite(_helicopter.position.x)&&std::isfinite(_helicopter.position.z),passed=_spawnTestCar&&_spawnTestHelicopter&&finite&&_heliPhysics.grounded&&carDistance>4.f&&helicopterDistance>7.f&&vehicleDistance>6.f;
    std::ostringstream out;out<<"{\n  \"test\": \"vehicle generation\",\n  \"car_generated\": "<<(_spawnTestCar?"true":"false")<<",\n  \"helicopter_generated\": "<<(_spawnTestHelicopter?"true":"false")<<",\n  \"helicopter_grounded\": "<<(_heliPhysics.grounded?"true":"false")<<",\n  \"car_distance_m\": "<<std::fixed<<std::setprecision(2)<<carDistance<<",\n  \"helicopter_distance_m\": "<<helicopterDistance<<",\n  \"vehicle_separation_m\": "<<vehicleDistance<<",\n  \"finite_state\": "<<(finite?"true":"false")<<",\n  \"passed\": "<<(passed?"true":"false")<<"\n}\n";
    std::ofstream("/tmp/chisinau-native-spawn.json")<<out.str();std::cout<<out.str()<<std::flush;dispatch_async(dispatch_get_main_queue(),^{[NSApp terminate:nil];});return;
  }
  if(now-_benchmarkStart<22)return;_benchmarkFinished=YES;
  auto samples=_benchmarkFrames;if(samples.empty())samples.push_back(1.0/60.0);std::sort(samples.begin(),samples.end());double sum=std::accumulate(samples.begin(),samples.end(),0.0),mean=sum/samples.size(),p95=samples[(size_t)(samples.size()*.95)],p99=samples[(size_t)(samples.size()*.99)];int loaded=0,nearDetail=0,nearDetailReady=0;for(auto&t:_tiles){if(t.state==2)loaded++;if(t.detail&&std::hypot(t.centerX-_helicopter.position.x,t.centerZ-_helicopter.position.z)<450.f){nearDetail++;if(t.state==2)nearDetailReady++;}}
  vector_float2 heliStart=helicopterBenchmarkStart(_benchmarkKind);
  double distance=_benchmarkKind==2?_carPhysics.distance:std::hypot(_helicopter.position.x-heliStart.x,_helicopter.position.z-heliStart.y);
  const char*sector=_benchmarkKind==4?"Columna":_benchmarkKind==9?"Șciusev":_benchmarkKind==10?"București":"Centru";
  std::ostringstream out;out<<"{\n  \"renderer\": \"Metal native\",\n  \"sector\": \""<<sector<<"\",\n  \"vehicle\": \""<<(_benchmarkKind==2?"car":"helicopter")<<"\",\n  \"physics_hz\": 120,\n  \"fog_enabled\": false,\n  \"view_distance_m\": "<<kNoFogViewDistance<<",\n  \"seconds\": "<<std::fixed<<std::setprecision(2)<<(now-_benchmarkStart)<<",\n  \"average_fps\": "<<1.0/mean<<",\n  \"p95_frame_ms\": "<<p95*1000<<",\n  \"p99_frame_ms\": "<<p99*1000<<",\n  \"max_frame_ms\": "<<_maxBenchmarkFrame*1000<<",\n  \"max_frame_at_s\": "<<_maxBenchmarkFrameAt<<",\n  \"frames_over_25ms\": "<<_stutters25<<",\n  \"frames_over_34ms\": "<<_stutters34<<",\n  \"frames_over_50ms\": "<<_stutters50<<",\n  \"tiles_loaded\": "<<loaded<<",\n  \"near_detail_tiles\": "<<nearDetail<<",\n  \"near_detail_tiles_ready\": "<<nearDetailReady<<",\n  \"distance_m\": "<<distance<<",\n  \"final_speed_kmh\": "<<(_benchmarkKind==2?std::abs(_car.speed):_helicopter.speed)*3.6;
  if(_benchmarkKind==2)out<<",\n  \"max_forward_kmh\": "<<_carBenchmarkMaxForward*3.6<<",\n  \"max_reverse_kmh\": "<<std::abs(_carBenchmarkMaxReverse)*3.6<<",\n  \"automatic_reverse_verified\": "<<(_carBenchmarkReversed?"true":"false");
  if(_benchmarkKind==2)out<<",\n  \"straight_w_deviation_m\": "<<_carStraightMaxDeviation;
  else out<<",\n  \"straight_w_deviation_m\": "<<_heliStraightMaxDeviation;
  out<<",\n  \"passed\": "<<(_stutters25==0&&p95<.022&&(_benchmarkKind==2||nearDetail==nearDetailReady)?"true":"false")<<"\n}\n";
  std::string file=_benchmarkKind==2?"/tmp/chisinau-native-benchmark-car.json":_benchmarkKind==4?"/tmp/chisinau-native-benchmark-columna.json":_benchmarkKind==9?"/tmp/chisinau-native-benchmark-sciusev.json":_benchmarkKind==10?"/tmp/chisinau-native-benchmark-bucuresti.json":"/tmp/chisinau-native-benchmark.json";std::ofstream(file)<<out.str();std::cout<<out.str()<<std::flush;
  dispatch_async(dispatch_get_main_queue(),^{[NSApp terminate:nil];});
}

- (void)drawInMTKView:(MTKView*)view {
  @autoreleasepool {
    double now=CACurrentMediaTime(),rawDt=now-_lastFrame;_lastFrame=now;float dt=(float)std::clamp(rawDt,1.0/240.0,1.0/24.0);
    if(_benchmark&&now-_benchmarkStart>3){_benchmarkFrames.push_back(rawDt);if(rawDt>_maxBenchmarkFrame){_maxBenchmarkFrame=rawDt;_maxBenchmarkFrameAt=now-_benchmarkStart;}if(rawDt>.025)_stutters25++;if(rawDt>.034)_stutters34++;if(rawDt>.05)_stutters50++;}
    _fpsAccumulator+=rawDt;_fpsFrames++;if(_fpsAccumulator>=.5){_displayFPS=(float)(_fpsFrames/_fpsAccumulator);_fpsFrames=0;_fpsAccumulator=0;}
    [self integratePending];[self updatePlayer:dt now:now];[self updateCamera:dt];[self updateStreaming:now];[self updateHUD:now];
    MTLRenderPassDescriptor*pass=view.currentRenderPassDescriptor;id<CAMetalDrawable>drawable=view.currentDrawable;if(!pass||!drawable){[_view finishInputFrame];return;}
    pass.colorAttachments[0].clearColor=MTLClearColorMake(.145,.285,.505,1);pass.colorAttachments[0].loadAction=MTLLoadActionClear;pass.depthAttachment.clearDepth=1;pass.depthAttachment.loadAction=MTLLoadActionClear;
    id<MTLCommandBuffer>command=[_queue commandBuffer];id<MTLRenderCommandEncoder>encoder=[command renderCommandEncoderWithDescriptor:pass];[encoder setCullMode:MTLCullModeNone];
    SkyUniforms sky{{_camera.x,_camera.y,_camera.z,(float)(now-_startTime)},{_cameraYaw,_cameraPitch,(float)(std::max(1.0,view.drawableSize.width)/std::max(1.0,view.drawableSize.height)),0}};
    [encoder setRenderPipelineState:_skyPipeline];[encoder setDepthStencilState:_skyDepth];[encoder setFragmentBytes:&sky length:sizeof(sky) atIndex:0];[encoder drawPrimitives:MTLPrimitiveTypeTriangle vertexStart:0 vertexCount:3];
    [encoder setRenderPipelineState:_pipeline];[encoder setDepthStencilState:_depth];
    [encoder setFragmentTexture:_asphaltTexture atIndex:0];[encoder setFragmentTexture:_pavementTexture atIndex:1];[encoder setFragmentTexture:_grassTexture atIndex:2];[encoder setFragmentSamplerState:_surfaceSampler atIndex:0];
    float aspect=std::max(1.0,view.drawableSize.width)/std::max(1.0,view.drawableSize.height),fov=_mode==PlayerMode::Helicopter?64.f:_mode==PlayerMode::Car?61.f:58.f;matrix_float4x4 vp=simd_mul(perspective(fov*kPi/180,aspect,.12f,_fogEnd),lookAt(_camera,_cameraTarget));
    Uniforms world{};world.viewProjection=vp;world.model=matrix_identity_float4x4;world.cameraAndFogStart={_camera.x,_camera.y,_camera.z,_fogStart};world.fogEndAndSun={_fogEnd,-85.f,110.f,65.f};world.tintAndTime={1,1,1,(float)(now-_startTime)};world.viewportAndExposure={(float)view.drawableSize.width,(float)view.drawableSize.height,1,0};
    [encoder setVertexBytes:&world length:sizeof(world) atIndex:1];[encoder setFragmentBytes:&world length:sizeof(world) atIndex:1];
    // Base context first, authoritative photo-authored geometry second. With
    // LessEqual depth the detailed surface wins even when a source footprint
    // is exactly coplanar with its lightweight streaming envelope.
    vector_float2 horizontalView={_cameraTarget.x-_camera.x,_cameraTarget.z-_camera.z};float horizontalLength=simd_length(horizontalView);if(horizontalLength>.001f)horizontalView/=horizontalLength;else horizontalView={0,-1};float horizontalTan=std::tan(fov*kPi/360.f)*aspect;
    PlayerState&p=[self activePlayer];for(int detailPass=0;detailPass<2;detailPass++)for(auto&tile:_tiles)if(tile.detail==(detailPass==1)&&tile.state==2&&!tile.chunks.empty()){
      float d=std::hypot(tile.centerX-p.position.x,tile.centerZ-p.position.z);if(d>=(tile.detail?1250.f:_fogEnd))continue;
      float tx=tile.centerX-_camera.x,tz=tile.centerZ-_camera.z,forward=tx*horizontalView.x+tz*horizontalView.y,side=std::abs(tx*horizontalView.y-tz*horizontalView.x),tileRadius=tile.detail?142.f:315.f;
      if(forward<-tileRadius||forward>0&&side>forward*horizontalTan+tileRadius)continue;
      tile.visibleChunks=std::min(tile.chunks.size(),tile.visibleChunks+1);
      for(size_t i=0;i<tile.visibleChunks;i++){auto&chunk=tile.chunks[i];[encoder setVertexBuffer:chunk.buffer offset:0 atIndex:0];[encoder drawPrimitives:MTLPrimitiveTypeTriangle vertexStart:0 vertexCount:chunk.vertexCount];}
    }
    [self drawActors:encoder vp:vp time:(float)(now-_startTime)];[encoder endEncoding];[command presentDrawable:drawable];[command commit];
    [_view finishInputFrame];[self finishBenchmark:now];
  }
}
- (void)mtkView:(MTKView*)view drawableSizeWillChange:(CGSize)size {}
@end

@interface AppDelegate : NSObject<NSApplicationDelegate>
@property(nonatomic,strong)NSWindow*window;
@property(nonatomic,strong)GameView*gameView;
@property(nonatomic,strong)CityRenderer*renderer;
@property(nonatomic)NSInteger benchmarkKind;
@end

@implementation AppDelegate
- (void)applicationDidFinishLaunching:(NSNotification*)notification {
  id<MTLDevice>device=MTLCreateSystemDefaultDevice();if(!device){NSAlert*a=[NSAlert new];a.messageText=@"Metal nu este disponibil pe acest Mac.";[a runModal];[NSApp terminate:nil];return;}
  NSRect frame=NSMakeRect(0,0,1280,800);self.window=[[NSWindow alloc]initWithContentRect:frame styleMask:NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskMiniaturizable|NSWindowStyleMaskResizable backing:NSBackingStoreBuffered defer:NO];
  self.window.title=@"Chișinău 3D · Native Metal";self.window.minSize=NSMakeSize(900,580);self.window.collectionBehavior=NSWindowCollectionBehaviorFullScreenPrimary;
  self.gameView=[[GameView alloc]initWithFrame:frame device:device];self.gameView.autoresizingMask=NSViewWidthSizable|NSViewHeightSizable;self.gameView.colorPixelFormat=MTLPixelFormatBGRA8Unorm_sRGB;self.gameView.depthStencilPixelFormat=MTLPixelFormatDepth32Float;self.gameView.sampleCount=1;self.gameView.preferredFramesPerSecond=60;self.gameView.paused=NO;self.gameView.enableSetNeedsDisplay=NO;
  self.renderer=[[CityRenderer alloc]initWithView:self.gameView resourcePath:NSBundle.mainBundle.resourcePath benchmarkKind:self.benchmarkKind];if(!self.renderer){[NSApp terminate:nil];return;}self.gameView.delegate=self.renderer;self.window.contentView=self.gameView;[self.window center];[self.window makeKeyAndOrderFront:nil];[NSApp activateIgnoringOtherApps:YES];
}
- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication*)sender{return YES;}
@end

int main(int argc,const char*argv[]){@autoreleasepool{
  NSInteger benchmarkKind=0;for(int i=1;i<argc;i++){std::string arg=argv[i];if(arg=="--benchmark")benchmarkKind=1;else if(arg=="--benchmark-car")benchmarkKind=2;else if(arg=="--test-interaction")benchmarkKind=3;else if(arg=="--benchmark-columna")benchmarkKind=4;else if(arg=="--preview-columna")benchmarkKind=5;else if(arg=="--test-walker")benchmarkKind=6;else if(arg=="--test-map")benchmarkKind=7;else if(arg=="--preview-map")benchmarkKind=8;else if(arg=="--benchmark-sciusev")benchmarkKind=9;else if(arg=="--benchmark-bucuresti")benchmarkKind=10;else if(arg=="--test-spawn")benchmarkKind=11;}
  NSApplication*app=NSApplication.sharedApplication;app.activationPolicy=NSApplicationActivationPolicyRegular;AppDelegate*delegate=[AppDelegate new];delegate.benchmarkKind=benchmarkKind;app.delegate=delegate;[app run];
}return 0;}
