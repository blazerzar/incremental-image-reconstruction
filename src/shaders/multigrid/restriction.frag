#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uColor;

void main() {
    vec2 texelSize = vec2(0.5) / vec2(textureSize(uColor, 0));
    vec4 a = texture(uColor, vPosition + vec2(-1,  1) * texelSize);
    vec4 b = texture(uColor, vPosition + vec2( 1,  1) * texelSize);
    vec4 c = texture(uColor, vPosition + vec2(-1, -1) * texelSize);
    vec4 d = texture(uColor, vPosition + vec2( 1, -1) * texelSize);

    vec4 weighted = 0.25 * (a + b + c + d);
    oColor = weighted;
}
