"use strict";

// Vertex Shader
const terrainVS = `#version 300 es

  in vec4 a_position;
  in vec2 a_texcoord;
  
  uniform mat4 u_world;
  uniform mat4 u_projection;
  uniform mat4 u_view;
  
  uniform vec3 u_viewWorldPosition;
  uniform vec3 u_lightWorldPosition;
  uniform float u_ballsPositions[15];
  uniform float u_ballsColors[15];
  uniform sampler2D displacementMap;
  uniform float u_displacementScale;
  
  out vec2 v_texcoord;
  out vec3 v_surfaceToView;
  out vec3 v_worldPosition;
  out vec3 v_surfaceToLight[5];
  out vec3 v_ballsColors[5]; 

  void main() {
    float displacement = texture(displacementMap, a_texcoord).a * u_displacementScale;
    vec4 displaced_position = a_position + vec4(0, displacement, 0, 0);

    gl_Position =  u_projection * u_view * u_world * displaced_position;
    
    vec3 surfaceWorldPosition = (u_world * displaced_position).xyz;

    v_texcoord = a_texcoord;

    int i, j;

    // montando o array de vetores de superficie para luz e de cores das bolas
    for (i = 0, j = 0; i < 15; i+=3, j++) {
      v_surfaceToLight[j] = vec3(u_ballsPositions[i] - surfaceWorldPosition.x, u_ballsPositions[i + 1] - surfaceWorldPosition.y, u_ballsPositions[i + 2] - surfaceWorldPosition.z);
      v_ballsColors[j] = vec3(u_ballsColors[i], u_ballsColors[i + 1], u_ballsColors[i + 2]);
    }

    v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
    v_worldPosition = surfaceWorldPosition;
    
  }
`;

// Fragment Shader
const terrainFS = `#version 300 es
precision highp float;

in vec3 v_surfaceToView;
in vec3 v_worldPosition;
in vec2 v_texcoord;
in vec3 v_surfaceToLight[5];
in vec3 v_ballsColors[5];

uniform vec3 u_lightDirection;
uniform float u_ambientLightIntensity;
uniform vec3 u_ambientLightColor;

uniform float u_kc;
uniform float u_kl;
uniform float u_kq;
uniform float u_specular;

out vec4 outColor;

void main() {
    // Calculating the normal
    vec3 dx = dFdx(v_worldPosition);
    vec3 dy = dFdy(v_worldPosition);
    vec3 normal = normalize(cross(dx, dy));

    // Calculating the color
    // vec3 color = vec3(0.4, 0.5, 0.1); // green
    // vec3 color = vec3(0.5, 0.5, 0.5); // gray
    vec3 color = vec3(0.4, 0.3, 0.1); // brown

    vec3 ambient = u_ambientLightIntensity * u_ambientLightColor * color;
    vec3 diffuse = vec3(max(dot(normal, u_lightDirection), 0.0)); // Initialize diffuse as a vec3
    vec3 lightColorAccumulation = vec3(0.0);

    for (int i = 0; i < 5; i += 1) {
        vec3 surfaceToLight = v_surfaceToLight[i];
        vec3 lightColor = v_ballsColors[i];

        float distance = length(surfaceToLight);
        vec3 pointLightDirection = normalize(surfaceToLight);
        float attenuation = 1.0 / (u_kc + u_kl * distance + u_kq * distance * distance);
        float pointDiffuse = max(dot(normal, pointLightDirection), 0.0);

        // Accumulate diffuse as a vec3
        diffuse += lightColor * pointDiffuse * attenuation;
    }

    // Combine ambient, diffuse, and specular lighting as vec3
    vec3 finalLight = ambient + diffuse + u_specular;

    outColor = vec4(color * finalLight, 1);
}

`;

export { terrainFS, terrainVS };
