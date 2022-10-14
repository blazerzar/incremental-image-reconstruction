#version 300 es
precision highp float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uLeft;
uniform sampler2D uRight;

void main() {
    vec4 cLeft = texture(uLeft, vPosition);
    vec4 cRight = texture(uRight, vPosition);

    oColor = cLeft * cRight;
}
