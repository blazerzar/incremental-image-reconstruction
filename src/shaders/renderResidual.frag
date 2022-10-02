#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uReconstruction;
uniform sampler2D uPoints;

void main() {
    float size = float(textureSize(uReconstruction, 0).x);
    float texelSize = 1.0 / size;
    float h = 1.0 / (size - 1.0);

    vec4 c = texture(uReconstruction, vPosition);
    vec4 l = texture(uReconstruction, vPosition + vec2(-1,  0) * texelSize);
    vec4 r = texture(uReconstruction, vPosition + vec2( 1,  0) * texelSize);
    vec4 d = texture(uReconstruction, vPosition + vec2( 0, -1) * texelSize);
    vec4 u = texture(uReconstruction, vPosition + vec2( 0,  1) * texelSize);

    vec4 points = texture(uPoints, vPosition);
    if (points.a < 1.0) {
        oColor = abs(l + r + d + u - 4.0 * c) / h;
    } else {
        oColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}