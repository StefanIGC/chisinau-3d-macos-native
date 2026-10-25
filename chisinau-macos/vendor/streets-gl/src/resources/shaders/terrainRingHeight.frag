#include <versionPrecision>
#include <boulevardGrade>

out float FragColor;

in vec2 vUv;

uniform sampler2DArray tHeight;

uniform PerMesh {
    vec4 transformHeight0;
    vec4 transformHeight1;
    vec2 morphOffset;
    float size;
    float segmentCount;
    float isLastRing;
    vec2 cameraPosition;
    ivec4 levelLayer;
    vec4 parkTerrain;
    vec4 parkEntrances;
};

float sampleHeight0(vec2 offset) {
    int level = levelLayer.x;
    int layer = levelLayer.y;
    vec2 textureSize = vec2(textureSize(tHeight, 0));
    return texelFetch(
        tHeight,
        ivec3(
            ivec2(offset * textureSize) / int(pow(2., float(level))),
            layer
        ),
        level
    ).r;
}
float sampleHeight1(vec2 offset) {
    int level = levelLayer.z;
    int layer = levelLayer.w;
    vec2 textureSize = vec2(textureSize(tHeight, 0));
    return texelFetch(
        tHeight,
        ivec3(
            ivec2(offset * textureSize) / int(pow(2., float(level))),
            layer
        ),
        level
    ).r;
}

void main() {
    vec2 vertexUV = (vUv - 0.5 / (segmentCount + 1.)) * ((segmentCount + 1.) / (segmentCount));
    vertexUV = (gl_FragCoord.xy - 0.5) / segmentCount;

    vec2 position = vec2(vertexUV.x, 1. - vertexUV.y) * size - size / 2.;

    vec2 dst = abs(cameraPosition - position);
    float morphFactor = max(dst.x, dst.y) / (size / 2.) * 2. - 1.;
    morphFactor = (morphFactor - 0.1) * 1.25;
    morphFactor = clamp(smoothstep(0., 1., morphFactor), 0., 1.);

    vec2 heightTexSize = vec2(textureSize(tHeight, 0));
    vec2 heightUV = vec2(1. - vertexUV.y, vertexUV.x);

    vec2 heightSelfUV0 = transformHeight0.xy + heightUV * transformHeight0.zw;
    vec2 heightSelfUV1 = transformHeight1.xy + heightUV * transformHeight1.zw;
    float height = sampleHeight0(heightSelfUV0);

    vec2 t = mod(vertexUV * segmentCount + morphOffset, 2.);
    vec2 t2 = mod(vertexUV * segmentCount + morphOffset, 4.);

    float heightSum = 0.;
    float heightWeight = 0.;

    vec2 offsetLeft = vec2(-1. / segmentCount, 0);
    vec2 offsetRight = vec2(1. / segmentCount, 0);

    vec2 offset = heightSelfUV1;

    if (t.x == 0. && t.y == 0.) {
        heightSum += sampleHeight1(offset);
        heightWeight += 1.;
    } else if (t.x == 1. && t.y == 0.) {
        heightSum += sampleHeight1(offset + offsetLeft.yx * transformHeight1.z);
        heightSum += sampleHeight1(offset + offsetRight.yx * transformHeight1.z);

        heightWeight += 2.;
    } else if (t.x == 0. && t.y == 1.) {
        heightSum += sampleHeight1(offset + offsetLeft.xy * transformHeight1.z);
        heightSum += sampleHeight1(offset + offsetRight.xy * transformHeight1.z);

        heightWeight += 2.;
    } else if (t.x == 1. && t.y == 1.) {
        float type = abs(t2.x - t2.y);

        if (type == 0.) {
            vec2 offset0 = vec2(-1. / segmentCount, -1. / segmentCount);
            vec2 offset1 = vec2(1. / segmentCount, 1. / segmentCount);

            heightSum += sampleHeight1(offset + offset0 * transformHeight1.z);
            heightSum += sampleHeight1(offset + offset1 * transformHeight1.z);

            heightWeight += 2.;
        } else {
            vec2 offset0 = vec2(-1. / segmentCount, 1. / segmentCount);
            vec2 offset1 = vec2(1. / segmentCount, -1. / segmentCount);

            heightSum += sampleHeight1(offset + offset0 * transformHeight1.z);
            heightSum += sampleHeight1(offset + offset1 * transformHeight1.z);

            heightWeight += 2.;
        }
    }

    if (heightWeight != 0.) {
        height = mix(height, heightSum / heightWeight, morphFactor);
    }

    if(parkTerrain.w>0.) {
        // The same local transform/profile as CathedralGrade.ts. Ring-relative
        // coordinates avoid loss of precision from million-metre Mercator values.
        float c=cos(.7793683518335637),s=sin(.7793683518335637);
        vec2 p=parkTerrain.xy+vec2(c*position.y-s*position.x,-s*position.y-c*position.x)/parkTerrain.w;
        height=boulevardGrade(p,height/parkTerrain.w)*parkTerrain.w;
        if(parkTerrain.z>0.) {
        float side=smoothstep(0.,8.,min(p.x+129.,178.-p.x));
        float north=side*smoothstep(-338.,-335.15,p.y)*(1.-smoothstep(-299.,-263.,p.y));
        float street=p.x<12.?mix(parkEntrances.x,parkEntrances.y,clamp((p.x+115.8)/127.8,0.,1.)):p.x>36.?mix(parkEntrances.y,parkEntrances.z,clamp((p.x-36.)/124.9,0.,1.)):parkEntrances.y;
        float landing=street+parkEntrances.w*clamp((p.y+335.15)/6.48,0.,1.);
        height=mix(height,landing*parkTerrain.w,north);
        float u=min(1.,abs(p.x-24.)/24.);
        float stair=-112.+6.*(1.-u*u);
        float rise=clamp((p.y-stair)/4.5,0.,1.)*.72;
        float weight=(1.-smoothstep(20.,36.,abs(p.x-24.)))*(1.-smoothstep(-85.,-35.,p.y));
        // Keep the native underlay under the authored treads at all terrain LODs.
        float clearance=.20*(1.-smoothstep(5.,14.,abs(p.y-stair-2.25)));
        height+=(rise-clearance)*weight*parkTerrain.w;
        }
    }
    FragColor = height;
}
