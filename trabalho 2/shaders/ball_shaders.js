"use strict";

const ballVS = `#version 300 es

in vec4 a_position;

uniform mat4 u_world;
uniform mat4 u_projection;
uniform mat4 u_view;

void main() {
    gl_Position =  u_projection * u_view * u_world * a_position;
}
`;

const ballFS = `#version 300 es
precision highp float;

uniform vec3 u_color;

out vec4 outColor;

void main() {
  outColor = vec4(u_color, 1.0);
}
`;

export { ballFS, ballVS };