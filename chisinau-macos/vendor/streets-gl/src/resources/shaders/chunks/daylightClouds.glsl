float cloudHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.17, 0.31, 0.47));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float cloudNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(cloudHash(i), cloudHash(i + vec3(1,0,0)), f.x),
                   mix(cloudHash(i + vec3(0,1,0)), cloudHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(cloudHash(i + vec3(0,0,1)), cloudHash(i + vec3(1,0,1)), f.x),
                   mix(cloudHash(i + vec3(0,1,1)), cloudHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float cloudShape(vec3 p) {
    return cloudNoise(p) * 0.57 + cloudNoise(p * 2.03 + 7.1) * 0.28
        + cloudNoise(p * 4.07 + 17.3) * 0.15;
}

float cloudDensity(vec3 p) {
    float height = (p.y - 1.4) / 0.65;
    float profile = smoothstep(0.0, 0.18, height) * (1.0 - smoothstep(0.48, 1.0, height));
    vec3 weather = p * vec3(0.85, 1.65, 0.85) + vec3(cloudTime * 0.007, 0.0, cloudTime * 0.002);
    float shape = cloudShape(weather);
    float erosion = cloudNoise(weather * 8.0) * 0.055;
    return max(0.0, shape - 0.54 - erosion) * profile * 8.0;
}

// A bounded cloud layer in kilometres. All six faces sample the same volume.
vec4 daylightClouds(vec3 ray, vec3 toSun) {
    if (ray.y < 0.025) return vec4(0, 0, 0, 1);
    float start = 1.4 / ray.y;
    float stepLength = min(0.65 / ray.y, 8.0) / 20.0;
    float transmission = 1.0;
    vec3 radiance = vec3(0);
    float forwardScatter = pow(max(dot(ray, toSun), 0.0), 14.0);
    for (int i = 0; i < 20; i++) {
        vec3 p = ray * (start + (float(i) + 0.5) * stepLength);
        float density = cloudDensity(p);
        if (density > 0.005) {
            float shadow = cloudDensity(p + toSun * 0.16) * 0.65
                + cloudDensity(p + toSun * 0.42) * 0.35;
            float sunlight = exp(-shadow * 3.8);
            vec3 light = vec3(0.23, 0.29, 0.37)
                + vec3(0.70, 0.66, 0.58) * sunlight
                + vec3(0.12, 0.10, 0.07) * forwardScatter * sunlight;
            float opacity = 1.0 - exp(-density * stepLength * 8.0);
            radiance += transmission * opacity * light;
            transmission *= 1.0 - opacity;
            if (transmission < 0.025) break;
        }
    }
    float horizonFade = smoothstep(0.025, 0.12, ray.y);
    return vec4(radiance * horizonFade, mix(1.0, transmission, horizonFade));
}
