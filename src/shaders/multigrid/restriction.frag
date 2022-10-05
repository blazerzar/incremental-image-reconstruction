#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uImage;
uniform bool uBoundary;

void main() {
    vec4 c = texture(uImage, vPosition);

    if (uBoundary) {
        // Boundary conditions on coarser grids are homogenous
        oColor = vec4(0.0, 0.0, 0.0, c.a);
    } else {
        oColor = c;
    }
}