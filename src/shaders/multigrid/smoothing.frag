#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uColor;
uniform sampler2D uRightHandSide;

void main() {
    vec2 texelSize = vec2(1) / vec2(textureSize(uColor, 0));
    vec4 l = texture(uColor, vPosition + vec2(-1,  0) * texelSize);
    vec4 r = texture(uColor, vPosition + vec2( 1,  0) * texelSize);
    vec4 d = texture(uColor, vPosition + vec2( 0, -1) * texelSize);
    vec4 u = texture(uColor, vPosition + vec2( 0,  1) * texelSize);
    vec4 f = texture(uRightHandSide, vPosition);
    vec4 average = 0.25 * (l + r + d + u - f);
    oColor = average;
}
