#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uImageA;
uniform sampler2D uImageB;
uniform float uR;
uniform float uG;
uniform float uB;
uniform float uA;

void main() {
    vec4 a = texture(uImageA, vPosition);
    vec4 b = texture(uImageB, vPosition);

    oColor = vec4(
        a.r + uR * b.r,
        a.g + uG * b.g,
        a.b + uB * b.b,
        a.a + uA * b.a
    );
}
