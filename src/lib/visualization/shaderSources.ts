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

// ============================================================================
// QUASAR - Fullscreen animated pattern with neon wireframe aesthetics
// ============================================================================
// This shader creates an animated cellular pattern with:
// - White solid cell outlines
// - White seed points with magenta/cyan glow halos
// - Variable density regions (smaller and larger cells)
// - Gentle orbital animation of cell centers
// - Transparent background for overlay on other visuals
// ============================================================================

export const VORONOI_FRAGMENT = `#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scale;           // Base cells per screen width (default: 5.0)
uniform float u_orbitRadius;     // Orbit radius relative to cell size (default: 0.3)
uniform float u_edgeWidth;       // Edge line width (default: 0.02)
uniform float u_glowIntensity;   // Seed point glow brightness (default: 2.0)
uniform float u_dotSize;         // Seed point radius (default: 0.04)
uniform float u_bassReactivity;  // How much dots/glow react to bass (1.0 = double)
uniform float u_bass;            // Audio reactivity - bass level (0-1)

out vec4 fragColor;

// Fast 2D hash function
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

// 1D hash for density
float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Smooth noise for density variation
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep

  float a = hash1(i);
  float b = hash1(i + vec2(1.0, 0.0));
  float c = hash1(i + vec2(0.0, 1.0));
  float d = hash1(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal noise for organic density regions
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;

  // Density variation: use fbm noise to create regions of different cell sizes
  // Slow-moving density field for organic feel
  vec2 densityUV = uv * 2.0 + u_time * 0.02;
  float densityNoise = fbm(densityUV);

  // Scale varies from 0.5x to 2x based on density noise
  float localScale = u_scale * (0.6 + densityNoise * 1.4);

  // Smooth eased pulse following bass level
  // pow(0.4) = quick rise, smoothstep curve = smooth S-curve
  float bassPulse = pow(u_bass, 0.4);
  bassPulse = bassPulse * bassPulse * (3.0 - 2.0 * bassPulse);

  // Scale coordinates with variable density
  vec2 p = uv * localScale;
  p.x *= aspect;

  vec2 cell = floor(p);

  // Track distances and points
  float nearest_sq = 1e10;
  float second_nearest_sq = 1e10;
  vec2 nearest_cell = vec2(0.0);
  vec2 nearest_point = vec2(0.0);

  // Extended 5x5 search for variable density (cells can be further apart)
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 neighbor = cell + vec2(float(x), float(y));

      // Random offset for seed point
      vec2 offset = hash2(neighbor);

      // Orbit animation
      float angularSpeed = 0.12 + offset.x * 0.08;
      float angle = u_time * angularSpeed + offset.y * 6.28318;

      // Fixed orbit radius (no bass modulation - was causing jitter)
      vec2 orbit = vec2(cos(angle), sin(angle)) * u_orbitRadius;

      // Seed point position (centered in cell with random offset + orbit)
      vec2 point = neighbor + 0.5 + (offset - 0.5) * 0.8 + orbit;

      vec2 diff = point - p;
      float dist_sq = dot(diff, diff);

      if (dist_sq < nearest_sq) {
        second_nearest_sq = nearest_sq;
        nearest_sq = dist_sq;
        nearest_cell = neighbor;
        nearest_point = point;
      } else if (dist_sq < second_nearest_sq) {
        second_nearest_sq = dist_sq;
      }
    }
  }

  float nearest_dist = sqrt(nearest_sq);
  float second_nearest_dist = sqrt(second_nearest_sq);

  // Edge detection - distance to cell boundary
  float edge_dist = second_nearest_dist - nearest_dist;

  // Edge rendering with glow (fixed width, no bass modulation)
  float edgeWidthAdjusted = u_edgeWidth;

  // Sharp white edge line (thin core)
  float edge_line = 1.0 - smoothstep(0.0, edgeWidthAdjusted, edge_dist);

  // Colored glow halo around edge lines - intensifies on beat
  float edgeGlowIntensity = u_glowIntensity * (0.8 + bassPulse * u_bassReactivity);
  float edge_glow = exp(-edge_dist / (edgeWidthAdjusted * 4.0)) * edgeGlowIntensity;

  // Seed point: white center with colored glow halo - reacts to beat
  float dotSizeAdjusted = u_dotSize * (1.0 + bassPulse * u_bassReactivity);

  // White core (sharp circle)
  float dot_core = 1.0 - smoothstep(dotSizeAdjusted * 0.3, dotSizeAdjusted * 0.5, nearest_dist);

  // Colored glow halo around seed point
  float dot_glow = exp(-nearest_dist / (dotSizeAdjusted * 1.5)) * u_glowIntensity;

  // Color for glows - alternating magenta/cyan based on cell
  float cell_id = mod(nearest_cell.x + nearest_cell.y, 2.0);
  vec3 magenta = vec3(1.0, 0.0, 1.0);
  vec3 cyan = vec3(0.0, 1.0, 1.0);
  vec3 glow_color = mix(magenta, cyan, cell_id);

  vec3 white = vec3(1.0);

  // Build up the final color in layers:
  // 1. Start with colored glow from edges (background layer)
  vec3 final_color = glow_color * edge_glow;

  // 2. Add colored glow from seed points
  final_color += glow_color * dot_glow;

  // 3. Add white edge lines on top
  final_color = mix(final_color, white, edge_line * 0.95);

  // 4. Add white dot core on top
  final_color = mix(final_color, white, dot_core);

  // Alpha: combine all glow and solid elements
  float alpha = max(max(edge_line * 0.95, dot_core), max(edge_glow * 0.6, dot_glow * 0.5));
  alpha = min(alpha, 1.0);

  fragColor = vec4(final_color, alpha);
}`;

// ============================================================================
// QUASAR BLOOM - Soft glow post-processing pass
// ============================================================================
// Applies a soft bloom/glow effect over the quasar pattern
// Uses a simple box blur approximation for performance
// ============================================================================

export const VORONOI_BLOOM_FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_bloomRadius;     // Blur radius in pixels (default: 8.0)
uniform float u_bloomIntensity;  // Bloom strength (default: 0.6)

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 texelSize = 1.0 / u_resolution;

  // Original color
  vec4 original = texture(u_texture, v_texCoord);

  // Gaussian-like blur using 9-tap pattern
  vec4 blur = vec4(0.0);
  float totalWeight = 0.0;

  // Sample in a circular pattern for softer blur
  for (float y = -2.0; y <= 2.0; y += 1.0) {
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      vec2 offset = vec2(x, y) * texelSize * u_bloomRadius;
      float weight = 1.0 - length(vec2(x, y)) / 3.5;
      weight = max(weight, 0.0);
      weight = weight * weight; // Gaussian-like falloff

      blur += texture(u_texture, v_texCoord + offset) * weight;
      totalWeight += weight;
    }
  }

  blur /= totalWeight;

  // Additive bloom: original + blurred glow
  vec3 bloomColor = original.rgb + blur.rgb * u_bloomIntensity;

  // Soft tone mapping to prevent harsh clipping
  bloomColor = bloomColor / (1.0 + bloomColor * 0.2);

  float alpha = max(original.a, blur.a * u_bloomIntensity);
  alpha = min(alpha, 1.0);

  fragColor = vec4(bloomColor, alpha);
}`;

// ============================================================================
// OSCILLO - Audio-reactive oscilloscope with zooming trails
// ============================================================================
// Three-pass rendering:
// 1. Trail pass: sample previous frame with zoom/rotation/fade
// 2. Line pass: draw oscilloscope waveform
// 3. Composite pass: render to screen
// ============================================================================

// Vertex shader for oscilloscope line (waveform data as vertices)
// NOTE: Original GL_LINE_STRIP version - kept for reference but not used
export const OSCILLO_LINE_VERTEX = `#version 300 es
in vec2 a_position;

uniform vec2 u_resolution;

void main() {
  // Convert pixel position to clip space
  vec2 clipPos = (a_position / u_resolution) * 2.0 - 1.0;
  clipPos.y *= -1.0;
  gl_Position = vec4(clipPos, 0.0, 1.0);
}`;

// Thick line vertex shader for mobile-compatible triangle strip rendering
// Each vertex has a position and normal offset for line thickness
export const OSCILLO_THICK_LINE_VERTEX = `#version 300 es
in vec2 a_position;
in vec2 a_normal;

uniform vec2 u_resolution;
uniform float u_lineWidth;

void main() {
  // Offset position perpendicular to line direction by half line width
  vec2 offset = a_normal * u_lineWidth * 0.5;
  vec2 pos = a_position + offset;

  // Convert pixel position to clip space
  vec2 clipPos = (pos / u_resolution) * 2.0 - 1.0;
  clipPos.y *= -1.0;
  gl_Position = vec4(clipPos, 0.0, 1.0);
}`;

// Fragment shader for oscilloscope line (neon glow color)
export const OSCILLO_LINE_FRAGMENT = `#version 300 es
precision mediump float;

uniform vec3 u_color;
uniform float u_glowIntensity;

out vec4 fragColor;

void main() {
  fragColor = vec4(u_color * u_glowIntensity, 1.0);
}`;

// Fragment shader for trail accumulation with zoom and rotation
export const OSCILLO_TRAIL_FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D u_previousFrame;
uniform vec2 u_resolution;
uniform float u_decay;
uniform float u_zoom;
uniform float u_rotation;

in vec2 v_texCoord;
out vec4 fragColor;

mat2 rotate2D(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 center = vec2(0.5);

  // Center UVs around origin
  vec2 centered = v_texCoord - center;

  // Apply rotation
  centered = rotate2D(u_rotation) * centered;

  // Apply zoom (scale from center)
  centered /= u_zoom;

  // Translate back
  centered += center;

  // Sample previous frame with transformed coordinates
  vec4 trail = vec4(0.0);
  if (centered.x >= 0.0 && centered.x <= 1.0 &&
      centered.y >= 0.0 && centered.y <= 1.0) {
    trail = texture(u_previousFrame, centered);
  }

  // Apply decay for trail fade
  fragColor = trail * u_decay;
}`;

// Fragment shader for final composite to screen (with optional glow)
export const OSCILLO_COMPOSITE_FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_glowIntensity;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);

  // Simple bloom effect: sample nearby pixels and add glow
  vec2 texelSize = 1.0 / u_resolution;
  vec4 glow = vec4(0.0);
  float totalWeight = 0.0;

  // 5x5 blur for glow
  for (float y = -2.0; y <= 2.0; y += 1.0) {
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      vec2 offset = vec2(x, y) * texelSize * 2.0;
      float weight = 1.0 - length(vec2(x, y)) / 3.5;
      weight = max(weight, 0.0);
      weight = weight * weight;

      glow += texture(u_texture, v_texCoord + offset) * weight;
      totalWeight += weight;
    }
  }
  glow /= totalWeight;

  // Combine original with glow
  vec3 finalColor = color.rgb + glow.rgb * (u_glowIntensity - 1.0);

  // Soft tone mapping
  finalColor = finalColor / (1.0 + finalColor * 0.15);

  float alpha = max(color.a, glow.a * 0.5);
  alpha = min(alpha, 1.0);

  fragColor = vec4(finalColor, alpha);
}`;

// ============================================================================
// LAVA - Metaball lava lamp effect
// ============================================================================
// Two-pass rendering:
// 1. Metaball pass: render metaballs to low-res texture using SDF
// 2. Upscale pass: bilinear upscale to screen
// ============================================================================

// Fragment shader for metaball rendering (low resolution)
// Two-color system: metaballs only merge with same color type
// Overlapping different colors create subtractive dark regions
export const LAVA_METABALL_FRAGMENT = `#version 300 es
precision mediump float;

#define MAX_METABALLS 80

uniform vec2 u_resolution;
uniform int u_numMetaballs;
uniform vec2 u_metaballPositions[MAX_METABALLS];
uniform float u_metaballRadii[MAX_METABALLS];
uniform vec3 u_metaballColors[MAX_METABALLS];
uniform int u_metaballTypes[MAX_METABALLS];  // 0 = magenta, 1 = cyan
uniform float u_threshold;
uniform float u_edgeSharpness;
uniform float u_glowIntensity;
uniform float u_debug;  // 1.0 to show debug dots at metaball centers

out vec4 fragColor;

float metaballInfluence(vec2 point, vec2 center, float radius) {
  vec2 diff = point - center;
  float distSq = dot(diff, diff);
  // Inverse square falloff for smooth blending
  return (radius * radius) / (distSq + 0.0001);
}

void main() {
  // Convert to normalized coordinates (-1 to 1)
  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;

  // Correct aspect ratio
  uv.x *= u_resolution.x / u_resolution.y;

  // Separate influence accumulation for each color type
  float magentaInfluence = 0.0;
  float cyanInfluence = 0.0;
  vec3 magentaColor = vec3(0.0);
  vec3 cyanColor = vec3(0.0);

  // Accumulate influences per color type (same colors merge, different don't)
  for (int i = 0; i < MAX_METABALLS; i++) {
    if (i >= u_numMetaballs) break;

    float influence = metaballInfluence(
      uv,
      u_metaballPositions[i],
      u_metaballRadii[i]
    );

    if (u_metaballTypes[i] == 0) {
      magentaInfluence += influence;
      magentaColor += u_metaballColors[i] * influence;
    } else {
      cyanInfluence += influence;
      cyanColor += u_metaballColors[i] * influence;
    }
  }

  // Normalize colors by their type's influence
  if (magentaInfluence > 0.001) magentaColor /= magentaInfluence;
  if (cyanInfluence > 0.001) cyanColor /= cyanInfluence;

  // Check if each type passes threshold (sharp cutoff for high contrast)
  bool magentaVisible = magentaInfluence > u_threshold;
  bool cyanVisible = cyanInfluence > u_threshold;

  if (!magentaVisible && !cyanVisible) {
    // Nothing visible - transparent background
    fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  vec3 finalColor;
  float alpha;

  // Sharp edge calculation - very tight transition for crisp borders
  float sharpness = u_edgeSharpness * 0.3; // Tighter edge

  if (magentaVisible && cyanVisible) {
    // OVERLAP: Difference blending - creates vibrant complementary colors
    float magentaEdge = smoothstep(u_threshold, u_threshold + sharpness, magentaInfluence);
    float cyanEdge = smoothstep(u_threshold, u_threshold + sharpness, cyanInfluence);

    float overlapStrength = min(magentaEdge, cyanEdge);

    // Mix the two colors based on relative strength
    float magentaDominance = magentaInfluence / (magentaInfluence + cyanInfluence);
    vec3 mixedColor = mix(cyanColor, magentaColor, magentaDominance);

    // Difference blend: creates vibrant yellow/green where magenta meets cyan
    vec3 diffColor = abs(magentaColor - cyanColor);
    finalColor = mix(mixedColor, diffColor, overlapStrength);

    alpha = max(magentaEdge, cyanEdge);
  } else if (magentaVisible) {
    // Only magenta - sharp solid blob
    float edge = smoothstep(u_threshold, u_threshold + sharpness, magentaInfluence);
    finalColor = magentaColor;
    alpha = edge;
  } else {
    // Only cyan - sharp solid blob
    float edge = smoothstep(u_threshold, u_threshold + sharpness, cyanInfluence);
    finalColor = cyanColor;
    alpha = edge;
  }

  // Subtle inner glow for depth (reduced intensity for cleaner look)
  float innerGlow = u_glowIntensity * 0.3;
  finalColor = finalColor * (1.0 + innerGlow);

  // Clamp to prevent oversaturation
  finalColor = min(finalColor, vec3(1.0));

  fragColor = vec4(finalColor, alpha);

  // Debug: render white dots at metaball centers
  if (u_debug > 0.5) {
    for (int i = 0; i < MAX_METABALLS; i++) {
      if (i >= u_numMetaballs) break;
      float dist = length(uv - u_metaballPositions[i]);
      if (dist < 0.02) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);  // White dot
      }
    }
  }
}`;

// Fragment shader for upscaling (simple bilinear through texture sampling)
export const LAVA_UPSCALE_FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_debugLines;  // 1.0 to show debug lines, 0.0 to hide

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texCoord);

  // Debug lines showing thermal zones
  // Physics y range: -1.5 to 1.5 (with -1 to 1 visible on screen)
  // texCoord.y = (physics_y + 1) / 2  (for visible range -1 to 1)
  if (u_debugLines > 0.5) {
    float lineWidth = 3.0 / u_resolution.y;

    // Red line at screen bottom (physics y = -1.0, texCoord = 0.0)
    if (abs(v_texCoord.y - 0.0) < lineWidth) {
      color = vec4(1.0, 0.0, 0.0, 1.0);
    }

    // Green line at heating threshold (physics y = -0.5, texCoord = 0.25)
    // Heating zone is BELOW this line (y < -0.5)
    float heatingY = 0.25;
    if (abs(v_texCoord.y - heatingY) < lineWidth) {
      color = vec4(0.0, 1.0, 0.0, 1.0);
    }

    // Blue line at screen top (physics y = 1.0, texCoord = 1.0)
    if (abs(v_texCoord.y - 1.0) < lineWidth) {
      color = vec4(0.0, 0.0, 1.0, 1.0);
    }
  }

  fragColor = color;
}`;

// Mobile version of lava shader with reduced metaball count for GPU compatibility
// Same two-color system as desktop version
export const LAVA_METABALL_FRAGMENT_MOBILE = `#version 300 es
precision mediump float;

#define MAX_METABALLS 80

uniform vec2 u_resolution;
uniform int u_numMetaballs;
uniform vec2 u_metaballPositions[MAX_METABALLS];
uniform float u_metaballRadii[MAX_METABALLS];
uniform vec3 u_metaballColors[MAX_METABALLS];
uniform int u_metaballTypes[MAX_METABALLS];  // 0 = magenta, 1 = cyan
uniform float u_threshold;
uniform float u_edgeSharpness;
uniform float u_glowIntensity;
uniform float u_debug;  // 1.0 to show debug dots at metaball centers

out vec4 fragColor;

float metaballInfluence(vec2 point, vec2 center, float radius) {
  vec2 diff = point - center;
  float distSq = dot(diff, diff);
  return (radius * radius) / (distSq + 0.0001);
}

void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;

  // Separate influence per color type
  float magentaInfluence = 0.0;
  float cyanInfluence = 0.0;
  vec3 magentaColor = vec3(0.0);
  vec3 cyanColor = vec3(0.0);

  for (int i = 0; i < MAX_METABALLS; i++) {
    if (i >= u_numMetaballs) break;
    float influence = metaballInfluence(uv, u_metaballPositions[i], u_metaballRadii[i]);

    if (u_metaballTypes[i] == 0) {
      magentaInfluence += influence;
      magentaColor += u_metaballColors[i] * influence;
    } else {
      cyanInfluence += influence;
      cyanColor += u_metaballColors[i] * influence;
    }
  }

  if (magentaInfluence > 0.001) magentaColor /= magentaInfluence;
  if (cyanInfluence > 0.001) cyanColor /= cyanInfluence;

  bool magentaVisible = magentaInfluence > u_threshold;
  bool cyanVisible = cyanInfluence > u_threshold;

  if (!magentaVisible && !cyanVisible) {
    fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  vec3 finalColor;
  float alpha;
  float sharpness = u_edgeSharpness * 0.3;

  if (magentaVisible && cyanVisible) {
    float magentaEdge = smoothstep(u_threshold, u_threshold + sharpness, magentaInfluence);
    float cyanEdge = smoothstep(u_threshold, u_threshold + sharpness, cyanInfluence);
    float overlapStrength = min(magentaEdge, cyanEdge);
    float magentaDominance = magentaInfluence / (magentaInfluence + cyanInfluence);
    vec3 mixedColor = mix(cyanColor, magentaColor, magentaDominance);
    // Difference blend: vibrant yellow/green where colors meet
    vec3 diffColor = abs(magentaColor - cyanColor);
    finalColor = mix(mixedColor, diffColor, overlapStrength);
    alpha = max(magentaEdge, cyanEdge);
  } else if (magentaVisible) {
    float edge = smoothstep(u_threshold, u_threshold + sharpness, magentaInfluence);
    finalColor = magentaColor;
    alpha = edge;
  } else {
    float edge = smoothstep(u_threshold, u_threshold + sharpness, cyanInfluence);
    finalColor = cyanColor;
    alpha = edge;
  }

  finalColor = finalColor * (1.0 + u_glowIntensity * 0.3);
  finalColor = min(finalColor, vec3(1.0));
  fragColor = vec4(finalColor, alpha);

  // Debug: render white dots at metaball centers
  if (u_debug > 0.5) {
    for (int i = 0; i < MAX_METABALLS; i++) {
      if (i >= u_numMetaballs) break;
      float dist = length(uv - u_metaballPositions[i]);
      if (dist < 0.02) {
        fragColor = vec4(1.0, 1.0, 1.0, 1.0);  // White dot
      }
    }
  }
}`;

// Fragment shader for glow pass (Gaussian blur underneath metaballs)
export const LAVA_GLOW_FRAGMENT = `#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_opacity;
uniform float u_brightness;
uniform float u_blurRadius;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 texelSize = 1.0 / u_resolution;
  vec4 color = vec4(0.0);
  float totalWeight = 0.0;

  // 5x5 Gaussian-weighted blur with configurable radius
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      // Gaussian weight based on distance from center
      float dist = float(x * x + y * y);
      float weight = exp(-dist / 2.0);

      vec2 offset = vec2(float(x), float(y)) * texelSize * u_blurRadius;
      color += texture(u_texture, v_texCoord + offset) * weight;
      totalWeight += weight;
    }
  }
  color /= totalWeight;

  // Apply brightness boost and opacity
  vec3 boostedColor = color.rgb * u_brightness;
  fragColor = vec4(boostedColor, color.a * u_opacity);
}`;
