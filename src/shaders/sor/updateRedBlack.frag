#version 300 es
precision mediump float;

in vec2 vPosition;
out vec4 oColor;

uniform sampler2D uReconstruction;
uniform sampler2D uPoints;
uniform sampler2D uF;
uniform bool uRedBlack;
uniform float uOmega;

void main() {
    vec4 points = texture(uPoints, vPosition);
    if (points.a > 0.0) {
        oColor = points;
        return;
    }

    float size = float(textureSize(uReconstruction, 0).x);
    vec4 c = texture(uReconstruction, vPosition);

    float total = floor(vPosition.x * size) + floor(vPosition.y * size);
    bool isRed = mod(total, 2.0) == 0.0;
    if (isRed ^^ uRedBlack) {
        oColor = c;
        return;
    }

    float texelSize = 1.0 / size;
    float h = 1.0 / (size - 1.0);

    vec4 f = texture(uF, vPosition);
    vec4 l = texture(uReconstruction, vPosition + vec2(-1,  0) * texelSize);
    vec4 r = texture(uReconstruction, vPosition + vec2( 1,  0) * texelSize);
    vec4 d = texture(uReconstruction, vPosition + vec2( 0, -1) * texelSize);
    vec4 u = texture(uReconstruction, vPosition + vec2( 0,  1) * texelSize);
    vec4 average = 0.25 * (l + r + d + u - h*h * f);

    oColor = uOmega * average + (1.0 - uOmega) * c;
}

