#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uColor;

void main() {
    oColor = texture(uColor, vPosition);
}
