#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uReconstruction;
uniform sampler2D uCorrection;

void main() {
    vec4 c = texture(uReconstruction, vPosition);
    vec4 correction = texture(uCorrection, vPosition);
    oColor = c + correction;
}