#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uImage;
uniform sampler2D uPoints;

void main() {
    float size = float(textureSize(uImage, 0).x);
    float texelSize = 1.0 / size;
    float h = 1.0 / (size - 1.0);

    vec4 c = texture(uImage, vPosition);
    vec4 l = texture(uImage, vPosition + vec2(-1,  0) * texelSize);
    vec4 r = texture(uImage, vPosition + vec2( 1,  0) * texelSize);
    vec4 d = texture(uImage, vPosition + vec2( 0, -1) * texelSize);
    vec4 u = texture(uImage, vPosition + vec2( 0,  1) * texelSize);

    vec4 points = texture(uPoints, vPosition);
    if (points.a < 1.0) {
        oColor = (l + r + d + u - 4.0 * c) / (h*h);
    } else {
        oColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}