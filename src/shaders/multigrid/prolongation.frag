#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uColor;
uniform sampler2D uEps;

void main() {
    vec4 correction = texture(uEps, vPosition);
    oColor = texture(uColor, vPosition) - correction;
}
