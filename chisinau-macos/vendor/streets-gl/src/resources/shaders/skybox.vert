#include <versionPrecision>

in vec3 position;

out vec3 vPosition;
out vec3 vNormal;
out vec4 vClipPos;

uniform Uniforms {
    mat4 projectionMatrix;
    mat4 modelViewMatrix;
    mat4 viewMatrix;
    mat4 skyRotationMatrix;
};

void main() {
    vNormal = position;

    vec3 transformedPosition = position;
    vec4 cameraSpacePosition = modelViewMatrix * vec4(transformedPosition, 1.0);

    vPosition = vec3(cameraSpacePosition);

    vClipPos = projectionMatrix * cameraSpacePosition;

    // The game shortens its far plane for streaming. Keep the sky at infinity.
    gl_Position = vec4(vClipPos.xy, vClipPos.w * 0.999999, vClipPos.w);
}
