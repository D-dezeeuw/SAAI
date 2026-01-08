// High-performance music-reactive particle system using point sprites
// Architecture: O(particles) instead of O(pixels × particles)

import { CONFIG } from './configuration';

export interface AudioData {
  intensity: number;    // 0-1, overall activity
  bass: number;         // 0-1, low frequency energy
  treble: number;       // 0-1, high frequency energy
  time: number;         // Musical time from Strudel
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  size: number;
  r: number;
  g: number;
  b: number;
  alpha: number;
  phase: number;
  twinkleSpeed: number;
  reactivity: number;      // How strongly this particle reacts to bass (0-1)
  speedMultiplier: number; // Individual speed variation for trails
}

interface Buffers {
  position: WebGLBuffer;
  size: WebGLBuffer;
  color: WebGLBuffer;
}

interface TrailFramebuffers {
  fbA: WebGLFramebuffer;
  fbB: WebGLFramebuffer;
  texA: WebGLTexture;
  texB: WebGLTexture;
  current: 'A' | 'B';
}

interface QuadResources {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  fadeProgram: WebGLProgram;
  compositeProgram: WebGLProgram;
  fadeUniforms: {
    u_texture: WebGLUniformLocation | null;
    u_fade: WebGLUniformLocation | null;
  };
  compositeUniforms: {
    u_texture: WebGLUniformLocation | null;
  };
}

export interface ShaderContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  programs: Record<string, WebGLProgram>;
  currentStyle: string;
  uniforms: Record<string, WebGLUniformLocation | null>;
  particles: Particle[];
  buffers: Buffers;
  vao: WebGLVertexArrayObject;
  animationId: number | null;
  lastAudio: AudioData;
  isIdle: boolean;
  startTime: number;
  // Pre-allocated arrays for particle data (avoids GC pressure)
  positionData: Float32Array;
  sizeData: Float32Array;
  colorData: Float32Array;
  // Trail-specific resources
  trailFramebuffers?: TrailFramebuffers;
  quadResources?: QuadResources;
}

// Shorthand color references from config
const CYAN = CONFIG.colors.cyan;
const PINK = CONFIG.colors.pink;

// Smoothstep interpolation for smooth direction transitions
function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// Vertex shader for point sprites
const VERTEX_SHADER = `#version 300 es
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
const ORBS_FRAGMENT = `#version 300 es
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
const STARS_FRAGMENT = `#version 300 es
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
const TRAILS_FRAGMENT = `#version 300 es
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
const QUAD_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_position * 0.5 + 0.5;
}`;

// Fragment shader for fading previous frame (trail persistence)
const FADE_FRAGMENT = `#version 300 es
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
const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  fragColor = texture(u_texture, v_texCoord);
}`;

// Compile shader
function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile error: ' + info);
  }

  return shader;
}

// Create program
function createProgram(gl: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error('Program link error: ' + info);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

// Create program with custom vertex shader
function createProgramWithVertex(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error('Program link error: ' + info);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

// Create trail framebuffers for ping-pong technique
function createTrailFramebuffers(gl: WebGL2RenderingContext, width: number, height: number): TrailFramebuffers {
  const createFB = (): { fb: WebGLFramebuffer; tex: WebGLTexture } => {
    const fb = gl.createFramebuffer();
    if (!fb) throw new Error('Failed to create framebuffer');

    const tex = gl.createTexture();
    if (!tex) throw new Error('Failed to create texture');

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    // Clear framebuffer to transparent
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return { fb, tex };
  };

  const a = createFB();
  const b = createFB();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    fbA: a.fb,
    fbB: b.fb,
    texA: a.tex,
    texB: b.tex,
    current: 'A',
  };
}

// Create quad resources for fullscreen passes
function createQuadResources(gl: WebGL2RenderingContext): QuadResources {
  // Create fullscreen quad vertices: two triangles
  const quadVertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create quad buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  // Create fade program
  const fadeProgram = createProgramWithVertex(gl, QUAD_VERTEX, FADE_FRAGMENT);
  const fadeUniforms = {
    u_texture: gl.getUniformLocation(fadeProgram, 'u_texture'),
    u_fade: gl.getUniformLocation(fadeProgram, 'u_fade'),
  };

  // Create composite program
  const compositeProgram = createProgramWithVertex(gl, QUAD_VERTEX, COMPOSITE_FRAGMENT);
  const compositeUniforms = {
    u_texture: gl.getUniformLocation(compositeProgram, 'u_texture'),
  };

  // Create VAO for quad
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Failed to create quad VAO');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Position attribute (same location for both programs)
  const posLoc = gl.getAttribLocation(fadeProgram, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  return {
    vao,
    buffer,
    fadeProgram,
    compositeProgram,
    fadeUniforms,
    compositeUniforms,
  };
}

// Create particles for a given style - count based on screen size
function createParticles(style: string, width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  // Base counts scaled by screen area (relative to 1920x1080 = ~2M pixels)
  const screenArea = width * height;
  const baseArea = 1920 * 1080;
  const scaleFactor = Math.sqrt(screenArea / baseArea); // sqrt for gentler scaling
  const sizeScale = Math.min(1, scaleFactor); // Cap at 1 for size scaling

  // Get style-specific config
  const styleConfig = CONFIG[style as keyof typeof CONFIG] as typeof CONFIG.orbs;
  const baseCount = styleConfig?.baseCount || 150;
  const count = Math.max(50, Math.min(baseCount * scaleFactor, baseCount));

  for (let i = 0; i < count; i++) {
    // Initial random position
    const x = Math.random() * width;
    const y = Math.random() * height;

    // Velocity based on style
    let vx = 0, vy = 0;
    if (style === 'orbs') {
      const cfg = CONFIG.orbs;
      vx = (Math.random() - 0.5) * cfg.velocityX * 2;
      vy = cfg.velocityYMin + Math.random() * (cfg.velocityYMax - cfg.velocityYMin);
    } else if (style === 'stars') {
      const cfg = CONFIG.stars;
      vx = (Math.random() - 0.5) * cfg.velocityRange * 2;
      vy = (Math.random() - 0.5) * cfg.velocityRange * 2;
    } else { // trails
      vx = CONFIG.trails.speed; // Initial velocity (direction changes dynamically)
      vy = 0;
    }

    // Size based on style - scaled by screen size for smaller screens
    let baseSize: number;
    if (style === 'orbs') {
      const cfg = CONFIG.orbs;
      baseSize = (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * sizeScale;
    } else if (style === 'stars') {
      const cfg = CONFIG.stars;
      baseSize = (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * sizeScale;
    } else { // trails
      const cfg = CONFIG.trails;
      baseSize = (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * sizeScale;
    }

    // Color interpolation between cyan and pink
    const colorT = Math.random();
    const r = CYAN.r + (PINK.r - CYAN.r) * colorT;
    const g = CYAN.g + (PINK.g - CYAN.g) * colorT;
    const b = CYAN.b + (PINK.b - CYAN.b) * colorT;

    // Alpha values from config
    let alpha: number;
    if (style === 'stars') {
      const cfg = CONFIG.stars;
      alpha = cfg.alphaMin + Math.random() * (cfg.alphaMax - cfg.alphaMin);
    } else if (style === 'orbs') {
      const cfg = CONFIG.orbs;
      alpha = cfg.alphaMin + Math.random() * (cfg.alphaMax - cfg.alphaMin);
    } else {
      const cfg = CONFIG.trails;
      alpha = cfg.alphaMin + Math.random() * (cfg.alphaMax - cfg.alphaMin);
    }

    // Twinkle speed from config
    const twinkleSpeed = CONFIG.stars.twinkleSpeedMin +
      Math.random() * (CONFIG.stars.twinkleSpeedMax - CONFIG.stars.twinkleSpeedMin);

    // Reactivity from config
    const reactivity = CONFIG.reactivity.particleReactivityMin +
      Math.random() * (CONFIG.reactivity.particleReactivityMax - CONFIG.reactivity.particleReactivityMin);

    // Speed multiplier for trails (random variation), 1.0 for other styles
    // Range: 0.3x to (1 + speedVariation/5)x - ensures no balls are nearly stopped
    const speedMultiplier = style === 'trails'
      ? 0.3 + Math.random() * (0.07 + CONFIG.trails.speedVariation / 15)
      : 1.0;

    particles.push({
      x, y, vx, vy,
      baseSize,
      size: baseSize,
      r, g, b,
      alpha,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed,
      reactivity,
      speedMultiplier,
    });
  }

  // Add extra large faded background orbs for 'orbs' style - scaled by screen size
  if (style === 'orbs') {
    const cfg = CONFIG.orbs;
    const largeOrbCount = Math.max(10, Math.floor(cfg.largeOrbCount * scaleFactor));
    for (let i = 0; i < largeOrbCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const vx = (Math.random() - 0.5) * 0.2; // Slower movement
      const vy = -0.1 - Math.random() * 0.2;  // Gentle upward drift
      const baseSize = (cfg.largeSizeMin + Math.random() * (cfg.largeSizeMax - cfg.largeSizeMin)) * sizeScale;

      // Color interpolation
      const colorT = Math.random();
      const r = CYAN.r + (PINK.r - CYAN.r) * colorT;
      const g = CYAN.g + (PINK.g - CYAN.g) * colorT;
      const b = CYAN.b + (PINK.b - CYAN.b) * colorT;

      particles.push({
        x, y, vx, vy,
        baseSize,
        size: baseSize,
        r, g, b,
        alpha: cfg.largeAlphaMin + Math.random() * (cfg.largeAlphaMax - cfg.largeAlphaMin),
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1,
        reactivity: 0.2 + Math.random() * 0.5, // Lower reactivity for background
        speedMultiplier: 1.0, // Large orbs don't need speed variation
      });
    }
  }

  return particles;
}

// Initialize shader system
export function initShader(canvas: HTMLCanvasElement, style: string): ShaderContext {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false, // Not needed for point sprites
  });

  if (!gl) {
    throw new Error('WebGL2 not supported');
  }

  // Set canvas size - NO devicePixelRatio for performance
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Create all programs
  const programs: Record<string, WebGLProgram> = {
    orbs: createProgram(gl, ORBS_FRAGMENT),
    stars: createProgram(gl, STARS_FRAGMENT),
    trails: createProgram(gl, TRAILS_FRAGMENT),
  };

  // Create particles
  const particles = createParticles(style, canvas.width, canvas.height);

  // Create buffers
  const positionBuffer = gl.createBuffer()!;
  const sizeBuffer = gl.createBuffer()!;
  const colorBuffer = gl.createBuffer()!;

  // Create VAO
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);

  // Setup position attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles.length * 2), gl.DYNAMIC_DRAW);
  const posLoc = gl.getAttribLocation(programs[style], 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Setup size attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles.length), gl.DYNAMIC_DRAW);
  const sizeLoc = gl.getAttribLocation(programs[style], 'a_size');
  gl.enableVertexAttribArray(sizeLoc);
  gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

  // Setup color attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particles.length * 4), gl.DYNAMIC_DRAW);
  const colorLoc = gl.getAttribLocation(programs[style], 'a_color');
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // Enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for glow

  // Get uniform locations
  const program = programs[style];
  const uniforms = {
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_bass: gl.getUniformLocation(program, 'u_bass'),
    u_time: gl.getUniformLocation(program, 'u_time'),
  };

  // Create trail-specific resources if needed
  const trailFramebuffers = style === 'trails'
    ? createTrailFramebuffers(gl, canvas.width, canvas.height)
    : undefined;
  const quadResources = style === 'trails'
    ? createQuadResources(gl)
    : undefined;

  const ctx: ShaderContext = {
    canvas,
    gl,
    programs,
    currentStyle: style,
    uniforms,
    particles,
    buffers: {
      position: positionBuffer,
      size: sizeBuffer,
      color: colorBuffer,
    },
    vao,
    animationId: null,
    lastAudio: { intensity: 0, bass: 0, treble: 0, time: 0 },
    isIdle: true,
    startTime: performance.now(),
    // Pre-allocate arrays to avoid GC pressure during playback
    positionData: new Float32Array(particles.length * 2),
    sizeData: new Float32Array(particles.length),
    colorData: new Float32Array(particles.length * 4),
    trailFramebuffers,
    quadResources,
  };

  // Initial buffer upload
  uploadParticleData(ctx);

  // Start render loop
  startRenderLoop(ctx);

  // Handle resize - recreate framebuffers if trails
  const resizeHandler = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Recreate framebuffers on resize for trails
    if (ctx.currentStyle === 'trails' && ctx.trailFramebuffers) {
      // Clean up old framebuffers
      gl.deleteFramebuffer(ctx.trailFramebuffers.fbA);
      gl.deleteFramebuffer(ctx.trailFramebuffers.fbB);
      gl.deleteTexture(ctx.trailFramebuffers.texA);
      gl.deleteTexture(ctx.trailFramebuffers.texB);
      // Create new ones
      ctx.trailFramebuffers = createTrailFramebuffers(gl, canvas.width, canvas.height);
    }
  };
  window.addEventListener('resize', resizeHandler);

  return ctx;
}

// Upload particle data to GPU buffers
function uploadParticleData(ctx: ShaderContext): void {
  const { gl, particles, buffers, positionData, sizeData, colorData } = ctx;

  // Reuse pre-allocated arrays to avoid GC pressure
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    positionData[i * 2] = p.x;
    positionData[i * 2 + 1] = p.y;
    sizeData[i] = p.size;
    colorData[i * 4] = p.r;
    colorData[i * 4 + 1] = p.g;
    colorData[i * 4 + 2] = p.b;
    colorData[i * 4 + 3] = p.alpha;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, positionData);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.size);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizeData);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorData);
}

// Render loop - just draws, no calculations
function startRenderLoop(ctx: ShaderContext): void {
  const render = () => {
    const { gl, programs, currentStyle, uniforms, particles, vao, canvas, lastAudio, startTime } = ctx;

    const time = (performance.now() - startTime) / 1000;

    // Trails use special framebuffer ping-pong technique
    if (currentStyle === 'trails' && ctx.trailFramebuffers && ctx.quadResources) {
      renderTrails(ctx, time);
    } else {
      // Standard rendering for orbs and stars
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const program = programs[currentStyle];
      gl.useProgram(program);

      // Update uniforms
      gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.u_bass, lastAudio.bass);
      gl.uniform1f(uniforms.u_time, time);

      // Draw particles
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.POINTS, 0, particles.length);
      gl.bindVertexArray(null);
    }

    ctx.animationId = requestAnimationFrame(render);
  };

  render();
}

// Render trails with framebuffer ping-pong for persistence
function renderTrails(ctx: ShaderContext, time: number): void {
  const { gl, programs, uniforms, particles, vao, canvas, lastAudio, trailFramebuffers, quadResources } = ctx;

  if (!trailFramebuffers || !quadResources) return;

  const { fbA, fbB, texA, texB, current } = trailFramebuffers;

  // Determine source and target framebuffers
  const targetFB = current === 'A' ? fbB : fbA;
  const sourceTex = current === 'A' ? texA : texB;
  const targetTex = current === 'A' ? texB : texA;

  // Step 1: Bind target framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, targetFB);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Step 2: Draw faded previous frame from source texture
  gl.useProgram(quadResources.fadeProgram);
  gl.bindTexture(gl.TEXTURE_2D, sourceTex);
  gl.uniform1i(quadResources.fadeUniforms.u_texture, 0);
  gl.uniform1f(quadResources.fadeUniforms.u_fade, CONFIG.trails.fadeFactor);

  // Disable blending for fade pass (we want exact fade multiplication)
  gl.disable(gl.BLEND);

  gl.bindVertexArray(quadResources.vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);

  // Step 3: Draw new particles on top with additive blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  const program = programs['trails'];
  gl.useProgram(program);

  gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.u_bass, lastAudio.bass);
  gl.uniform1f(uniforms.u_time, time);

  gl.bindVertexArray(vao);
  gl.drawArrays(gl.POINTS, 0, particles.length);
  gl.bindVertexArray(null);

  // Step 4: Composite to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Use regular blending to composite the result
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(quadResources.compositeProgram);
  gl.bindTexture(gl.TEXTURE_2D, targetTex);
  gl.uniform1i(quadResources.compositeUniforms.u_texture, 0);

  gl.bindVertexArray(quadResources.vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);

  // Reset blend mode
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  // Step 5: Swap framebuffers
  trailFramebuffers.current = current === 'A' ? 'B' : 'A';
}

// Update particles - called at musical time intervals, not every frame
export function updateShader(ctx: ShaderContext, audio: AudioData): void {
  ctx.lastAudio = audio;
  ctx.isIdle = false;

  const { particles, canvas, currentStyle } = ctx;
  const time = audio.time;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    if (currentStyle === 'trails') {
      // Trails: smooth direction changes every N beats (same for all particles)
      const cfg = CONFIG.trails;

      // Get current and previous beat phases for interpolation
      const beatProgress = time / cfg.directionChangeBeats;
      const currentPhase = Math.floor(beatProgress);
      const prevPhase = currentPhase - 1;

      // Interpolation factor (0 to 1 within current beat cycle)
      const t = beatProgress - currentPhase;
      const smoothT = smoothstep(t);

      // Calculate direction for current phase (seeded random)
      const seedX1 = Math.sin(currentPhase * 12.9898) * 43758.5453;
      const seedY1 = Math.sin(currentPhase * 78.233) * 43758.5453;
      const currDirX = ((seedX1 - Math.floor(seedX1)) * 2 - 1) * 10;
      const currDirY = ((seedY1 - Math.floor(seedY1)) * 2 - 1) * 10;

      // Calculate direction for previous phase (seeded random)
      const seedX0 = Math.sin(prevPhase * 12.9898) * 43758.5453;
      const seedY0 = Math.sin(prevPhase * 78.233) * 43758.5453;
      const prevDirX = ((seedX0 - Math.floor(seedX0)) * 2 - 1) * 10;
      const prevDirY = ((seedY0 - Math.floor(seedY0)) * 2 - 1) * 10;

      // Smoothly interpolate between previous and current direction
      const dirX = prevDirX + (currDirX - prevDirX) * smoothT;
      const dirY = prevDirY + (currDirY - prevDirY) * smoothT;

      // Normalize to consistent speed
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

      p.x += (dirX / len) * cfg.speed * p.speedMultiplier;
      p.y += (dirY / len) * cfg.speed * p.speedMultiplier;

      // Wrap around screen edges
      if (p.x > canvas.width + p.size) {
        p.x = -p.size;
        p.y = Math.random() * canvas.height;
      }
      if (p.x < -p.size) {
        p.x = canvas.width + p.size;
        p.y = Math.random() * canvas.height;
      }
      if (p.y > canvas.height + p.size) {
        p.y = -p.size;
        p.x = Math.random() * canvas.width;
      }
      if (p.y < -p.size) {
        p.y = canvas.height + p.size;
        p.x = Math.random() * canvas.width;
      }
    } else {
      // Other styles: movement with sin/cos wobble
      const wobbleX = Math.sin(time * 0.5 + p.phase) * 2;
      const wobbleY = Math.cos(time * 0.3 + p.phase * 1.5) * 1.5;

      p.x += p.vx + wobbleX * 0.3;
      p.y += p.vy + wobbleY * 0.3;

      // Wrap around screen
      if (p.y < -p.size) {
        p.y = canvas.height + p.size;
        p.x = Math.random() * canvas.width;
      }
      if (p.y > canvas.height + p.size) {
        p.y = -p.size;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -p.size) p.x = canvas.width + p.size;
      if (p.x > canvas.width + p.size) p.x = -p.size;
    }

    // Size pulses with bass - scaled by particle's reactivity
    const react = CONFIG.reactivity;
    p.size = p.baseSize * (1.0 + audio.bass * react.bassSizeMultiplier * p.reactivity);

    // Alpha based on intensity - higher base for punchier visuals
    const baseAlpha = 0.6 + audio.intensity * 0.4;

    // Twinkle for stars
    if (currentStyle === 'stars') {
      const twinkle = Math.sin(time * p.twinkleSpeed + p.phase) * 0.5 + 0.5;
      p.alpha = baseAlpha * (0.6 + twinkle * 0.4 + audio.treble * 0.2 * p.reactivity);
    } else {
      p.alpha = baseAlpha + audio.bass * react.bassAlphaMultiplier * p.reactivity;
    }

    // Color shift with treble
    const colorShift = audio.treble * react.trebleColorShift;
    const baseColorT = (Math.sin(p.phase) * 0.5 + 0.5);
    const colorT = Math.min(1, baseColorT + colorShift);
    p.r = CYAN.r + (PINK.r - CYAN.r) * colorT;
    p.g = CYAN.g + (PINK.g - CYAN.g) * colorT;
    p.b = CYAN.b + (PINK.b - CYAN.b) * colorT;
  }

  // Upload updated data to GPU
  uploadParticleData(ctx);
}

// Set to idle mode
export function setShaderIdle(ctx: ShaderContext): void {
  ctx.isIdle = true;
  // Keep particles gently moving with modest values for visibility
  const idle = CONFIG.idle;
  updateShader(ctx, { intensity: idle.intensity, bass: idle.bass, treble: idle.treble, time: ctx.lastAudio.time });
}

// Change visual style
export function setShaderStyle(ctx: ShaderContext, style: string): void {
  if (ctx.currentStyle === style) return;

  const { gl, canvas, programs, buffers, vao } = ctx;
  const wasTrails = ctx.currentStyle === 'trails';
  const willBeTrails = style === 'trails';

  // Clean up old trail resources if switching away from trails
  if (wasTrails && ctx.trailFramebuffers) {
    gl.deleteFramebuffer(ctx.trailFramebuffers.fbA);
    gl.deleteFramebuffer(ctx.trailFramebuffers.fbB);
    gl.deleteTexture(ctx.trailFramebuffers.texA);
    gl.deleteTexture(ctx.trailFramebuffers.texB);
    ctx.trailFramebuffers = undefined;
  }
  if (wasTrails && ctx.quadResources) {
    gl.deleteProgram(ctx.quadResources.fadeProgram);
    gl.deleteProgram(ctx.quadResources.compositeProgram);
    gl.deleteVertexArray(ctx.quadResources.vao);
    gl.deleteBuffer(ctx.quadResources.buffer);
    ctx.quadResources = undefined;
  }

  // Create trail resources if switching to trails
  if (willBeTrails && !ctx.trailFramebuffers) {
    ctx.trailFramebuffers = createTrailFramebuffers(gl, canvas.width, canvas.height);
    ctx.quadResources = createQuadResources(gl);
  }

  // Recreate particles for new style
  ctx.particles = createParticles(style, canvas.width, canvas.height);
  ctx.currentStyle = style;

  // Reallocate pre-allocated arrays for new particle count
  ctx.positionData = new Float32Array(ctx.particles.length * 2);
  ctx.sizeData = new Float32Array(ctx.particles.length);
  ctx.colorData = new Float32Array(ctx.particles.length * 4);

  // Reallocate GPU buffers for new particle count
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctx.particles.length * 2), gl.DYNAMIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.size);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctx.particles.length), gl.DYNAMIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ctx.particles.length * 4), gl.DYNAMIC_DRAW);

  // Re-setup VAO for new program
  const program = programs[style];
  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  const posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.size);
  const sizeLoc = gl.getAttribLocation(program, 'a_size');
  gl.enableVertexAttribArray(sizeLoc);
  gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  const colorLoc = gl.getAttribLocation(program, 'a_color');
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // Update uniform locations for new program
  ctx.uniforms = {
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_bass: gl.getUniformLocation(program, 'u_bass'),
    u_time: gl.getUniformLocation(program, 'u_time'),
  };

  // Upload initial data
  uploadParticleData(ctx);
}

// Stop the render loop (keeps resources allocated)
export function stopShader(ctx: ShaderContext): void {
  if (ctx.animationId) {
    cancelAnimationFrame(ctx.animationId);
    ctx.animationId = null;
  }
}

// Start the render loop (if not already running)
export function startShader(ctx: ShaderContext): void {
  if (ctx.animationId === null) {
    startRenderLoop(ctx);
  }
}

// Cleanup
export function cleanupShader(ctx: ShaderContext): void {
  if (ctx.animationId) {
    cancelAnimationFrame(ctx.animationId);
  }

  const { gl, programs, buffers, vao } = ctx;

  Object.values(programs).forEach(p => gl.deleteProgram(p));
  gl.deleteBuffer(buffers.position);
  gl.deleteBuffer(buffers.size);
  gl.deleteBuffer(buffers.color);
  gl.deleteVertexArray(vao);

  // Clean up trail resources
  if (ctx.trailFramebuffers) {
    gl.deleteFramebuffer(ctx.trailFramebuffers.fbA);
    gl.deleteFramebuffer(ctx.trailFramebuffers.fbB);
    gl.deleteTexture(ctx.trailFramebuffers.texA);
    gl.deleteTexture(ctx.trailFramebuffers.texB);
  }
  if (ctx.quadResources) {
    gl.deleteProgram(ctx.quadResources.fadeProgram);
    gl.deleteProgram(ctx.quadResources.compositeProgram);
    gl.deleteVertexArray(ctx.quadResources.vao);
    gl.deleteBuffer(ctx.quadResources.buffer);
  }
}
