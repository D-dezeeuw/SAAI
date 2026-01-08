/**
 * GLSL shader source code for WebGL particle visualizations
 * Separated from shader.ts for better organization
 */

// Vertex shader for point sprites
export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in float a_size;
in vec4 a_color;

uniform vec2 u_resolution;
uniform float u_bass;
uniform float u_time;

out vec4 v_color;

void main() {
  // Convert pixel position to clip space
  vec2 clipPos = (a_position / u_resolution) * 2.0 - 1.0;
  clipPos.y *= -1.0;
  gl_Position = vec4(clipPos, 0.0, 1.0);

  // Point size with bass pulse - more pronounced reaction
  gl_PointSize = a_size * (0.7 + u_bass * 0.8);

  v_color = a_color;
}`;

// Fragment shader for soft glowing orbs - gentle and ambient
export const ORBS_FRAGMENT = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float dist = length(coord);

  if (dist > 1.0) discard;

  // Soft diffuse glow - toned down
  float glow = exp(-dist * dist * 2.5);
  // Subtle core
  float core = exp(-dist * dist * 8.0);

  float brightness = glow * 0.4 + core * 0.3;

  fragColor = vec4(v_color.rgb * brightness, v_color.a * brightness);
}`;

// Fragment shader for twinkling stars
export const STARS_FRAGMENT = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float dist = length(coord);

  if (dist > 1.0) discard;

  // 4-pointed star shape
  float angle = atan(coord.y, coord.x);
  float star = abs(cos(angle * 2.0));
  float shape = mix(dist, dist * (1.0 - star * 0.5), 0.6);

  // Sharp bright center
  float glow = exp(-shape * shape * 8.0);
  float core = exp(-dist * dist * 20.0);

  float brightness = glow + core * 2.0;

  fragColor = vec4(v_color.rgb * brightness, v_color.a * brightness);
}`;

// Fragment shader for flowing trails - simple circular dot (framebuffer handles the trail)
export const TRAILS_FRAGMENT = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float dist = length(coord);

  if (dist > 1.0) discard;

  // Soft circular dot with bright core
  float glow = exp(-dist * dist * 3.0);
  float core = exp(-dist * dist * 10.0);

  float brightness = glow * 0.5 + core * 0.8;

  fragColor = vec4(v_color.rgb * brightness, v_color.a * brightness);
}`;

// Vertex shader for fullscreen quad (fade pass and composite)
export const QUAD_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}`;

// Fragment shader for fading previous frame (trail persistence)
export const FADE_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_fade;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  fragColor = color * u_fade;
}`;

// Fragment shader for compositing framebuffer to screen
export const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(u_texture, v_texCoord);
}`;
