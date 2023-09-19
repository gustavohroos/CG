"use strict";

const boxVS = `#version 300 es

in vec4 a_position;

uniform mat4 u_world;
uniform mat4 u_projection;
uniform mat4 u_view;

void main() {
    gl_Position =  u_projection * u_view * u_world * a_position;
}
`;

const boxFS = `#version 300 es
precision highp float;

uniform vec4 u_color;

out vec4 outColor;

void main() {
  outColor = vec4(u_color);
}
`;

export { boxFS, boxVS };