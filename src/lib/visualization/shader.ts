// High-performance music-reactive particle system using point sprites
// Architecture: O(particles) instead of O(pixels × particles)

import { CONFIG } from '../config/configuration';
import {
  interpolateColor,
  randomInRange,
  getSizeForStyle,
  getAlphaForStyle,
  createProgram,
  smoothstep,
  getTrailDirection,
  wrapPosition,
} from './shaderUtils';
import {
  VERTEX_SHADER,
  ORBS_FRAGMENT,
  STARS_FRAGMENT,
  TRAILS_FRAGMENT,
  QUAD_VERTEX,
  FADE_FRAGMENT,
  COMPOSITE_FRAGMENT,
  VORONOI_FRAGMENT,
  VORONOI_BLOOM_FRAGMENT,
  OSCILLO_LINE_VERTEX,
  OSCILLO_LINE_FRAGMENT,
  OSCILLO_TRAIL_FRAGMENT,
  OSCILLO_COMPOSITE_FRAGMENT,
  LAVA_METABALL_FRAGMENT,
  LAVA_UPSCALE_FRAGMENT,
} from './shaderSources';
import type { AudioData } from '../types';

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

// Quasar-specific resources for fullscreen shader rendering with bloom
interface QuasarResources {
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  // Main quasar program
  program: WebGLProgram;
  uniforms: {
    u_resolution: WebGLUniformLocation | null;
    u_time: WebGLUniformLocation | null;
    u_scale: WebGLUniformLocation | null;
    u_orbitRadius: WebGLUniformLocation | null;
    u_edgeWidth: WebGLUniformLocation | null;
    u_glowIntensity: WebGLUniformLocation | null;
    u_dotSize: WebGLUniformLocation | null;
    u_bass: WebGLUniformLocation | null;
  };
  // Bloom post-processing
  bloomProgram: WebGLProgram;
  bloomUniforms: {
    u_texture: WebGLUniformLocation | null;
    u_resolution: WebGLUniformLocation | null;
    u_bloomRadius: WebGLUniformLocation | null;
    u_bloomIntensity: WebGLUniformLocation | null;
  };
  // Framebuffer for render-to-texture
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

// Oscillo-specific resources for oscilloscope with zoom/rotation trails
interface OscilloResources {
  // Programs
  lineProgram: WebGLProgram;
  trailProgram: WebGLProgram;
  compositeProgram: WebGLProgram;
  // Line uniforms
  lineUniforms: {
    u_resolution: WebGLUniformLocation | null;
    u_color: WebGLUniformLocation | null;
    u_glowIntensity: WebGLUniformLocation | null;
  };
  // Trail uniforms
  trailUniforms: {
    u_previousFrame: WebGLUniformLocation | null;
    u_resolution: WebGLUniformLocation | null;
    u_decay: WebGLUniformLocation | null;
    u_zoom: WebGLUniformLocation | null;
    u_rotation: WebGLUniformLocation | null;
  };
  // Composite uniforms
  compositeUniforms: {
    u_texture: WebGLUniformLocation | null;
    u_resolution: WebGLUniformLocation | null;
    u_glowIntensity: WebGLUniformLocation | null;
  };
  // Geometry
  quadVao: WebGLVertexArrayObject;
  quadBuffer: WebGLBuffer;
  lineVao: WebGLVertexArrayObject;
  lineBuffer: WebGLBuffer;
  // Ping-pong framebuffers
  fbA: WebGLFramebuffer;
  fbB: WebGLFramebuffer;
  texA: WebGLTexture;
  texB: WebGLTexture;
  current: 'A' | 'B';
  // State
  waveformData: Float32Array;
  frequencyData: Uint8Array;
  lineVertices: Float32Array;
  trailRotation: number;        // Cumulative rotation for the trail effect
  energyHistory: number[];
  lastBeatTime: number;
}

// Lava lamp metaball data
interface LavaMetaball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  phase: number;
  colorType: 'magenta' | 'cyan';
}

// Lava-specific resources for metaball rendering
interface LavaResources {
  // Programs
  metaballProgram: WebGLProgram;
  upscaleProgram: WebGLProgram;
  // Framebuffer for low-res rendering
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  lowResWidth: number;
  lowResHeight: number;
  // Geometry
  quadVao: WebGLVertexArrayObject;
  quadBuffer: WebGLBuffer;
  // Uniforms
  metaballUniforms: {
    u_resolution: WebGLUniformLocation | null;
    u_numMetaballs: WebGLUniformLocation | null;
    u_metaballPositions: WebGLUniformLocation | null;
    u_metaballRadii: WebGLUniformLocation | null;
    u_metaballColors: WebGLUniformLocation | null;
    u_threshold: WebGLUniformLocation | null;
    u_edgeSharpness: WebGLUniformLocation | null;
    u_glowIntensity: WebGLUniformLocation | null;
  };
  upscaleUniforms: {
    u_texture: WebGLUniformLocation | null;
    u_resolution: WebGLUniformLocation | null;
  };
  // State
  metaballs: LavaMetaball[];
  lastTime: number;
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
  // Quasar-specific resources
  quasarResources?: QuasarResources;
  // Oscillo-specific resources
  oscilloResources?: OscilloResources;
  // Lava-specific resources
  lavaResources?: LavaResources;
  // Resize handler for cleanup
  resizeHandler?: () => void;
}

// Shorthand color references from config
const CYAN = CONFIG.colors.cyan;
const PINK = CONFIG.colors.pink;

// Helper to create program with default vertex shader
function createParticleProgram(gl: WebGL2RenderingContext, fragmentSource: string): WebGLProgram {
  return createProgram(gl, VERTEX_SHADER, fragmentSource);
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
  const fadeProgram = createProgram(gl, QUAD_VERTEX, FADE_FRAGMENT);
  const fadeUniforms = {
    u_texture: gl.getUniformLocation(fadeProgram, 'u_texture'),
    u_fade: gl.getUniformLocation(fadeProgram, 'u_fade'),
  };

  // Create composite program
  const compositeProgram = createProgram(gl, QUAD_VERTEX, COMPOSITE_FRAGMENT);
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

// Create quasar resources for fullscreen shader rendering with bloom
function createQuasarResources(gl: WebGL2RenderingContext, width: number, height: number): QuasarResources {
  // Create fullscreen quad vertices: two triangles
  const quadVertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create quasar quad buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  // Create quasar program (fullscreen quad + quasar fragment)
  const program = createProgram(gl, QUAD_VERTEX, VORONOI_FRAGMENT);

  // Get all uniform locations for quasar shader
  const uniforms = {
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_time: gl.getUniformLocation(program, 'u_time'),
    u_scale: gl.getUniformLocation(program, 'u_scale'),
    u_orbitRadius: gl.getUniformLocation(program, 'u_orbitRadius'),
    u_edgeWidth: gl.getUniformLocation(program, 'u_edgeWidth'),
    u_glowIntensity: gl.getUniformLocation(program, 'u_glowIntensity'),
    u_dotSize: gl.getUniformLocation(program, 'u_dotSize'),
    u_bassReactivity: gl.getUniformLocation(program, 'u_bassReactivity'),
    u_bass: gl.getUniformLocation(program, 'u_bass'),
  };

  // Create bloom post-processing program
  const bloomProgram = createProgram(gl, QUAD_VERTEX, VORONOI_BLOOM_FRAGMENT);
  const bloomUniforms = {
    u_texture: gl.getUniformLocation(bloomProgram, 'u_texture'),
    u_resolution: gl.getUniformLocation(bloomProgram, 'u_resolution'),
    u_bloomRadius: gl.getUniformLocation(bloomProgram, 'u_bloomRadius'),
    u_bloomIntensity: gl.getUniformLocation(bloomProgram, 'u_bloomIntensity'),
  };

  // Create framebuffer for quasar render-to-texture
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Failed to create quasar framebuffer');

  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create quasar texture');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // Create VAO for quad
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Failed to create quasar VAO');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Position attribute (same for all programs)
  const posLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  return {
    vao,
    buffer,
    program,
    uniforms,
    bloomProgram,
    bloomUniforms,
    framebuffer,
    texture,
  };
}

// Create oscillo resources for oscilloscope with zoom/rotation trails
function createOscilloResources(gl: WebGL2RenderingContext, width: number, height: number): OscilloResources {
  // Create fullscreen quad vertices for trail and composite passes
  const quadVertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const quadBuffer = gl.createBuffer();
  if (!quadBuffer) throw new Error('Failed to create oscillo quad buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  // Create line buffer for waveform (dynamic, updated each frame)
  // Using 512 samples for waveform visualization
  const numSamples = 512;
  const lineBuffer = gl.createBuffer();
  if (!lineBuffer) throw new Error('Failed to create oscillo line buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(numSamples * 2), gl.DYNAMIC_DRAW);

  // Create programs
  const lineProgram = createProgram(gl, OSCILLO_LINE_VERTEX, OSCILLO_LINE_FRAGMENT);
  const trailProgram = createProgram(gl, QUAD_VERTEX, OSCILLO_TRAIL_FRAGMENT);
  const compositeProgram = createProgram(gl, QUAD_VERTEX, OSCILLO_COMPOSITE_FRAGMENT);

  // Get uniform locations
  const lineUniforms = {
    u_resolution: gl.getUniformLocation(lineProgram, 'u_resolution'),
    u_color: gl.getUniformLocation(lineProgram, 'u_color'),
    u_glowIntensity: gl.getUniformLocation(lineProgram, 'u_glowIntensity'),
  };

  const trailUniforms = {
    u_previousFrame: gl.getUniformLocation(trailProgram, 'u_previousFrame'),
    u_resolution: gl.getUniformLocation(trailProgram, 'u_resolution'),
    u_decay: gl.getUniformLocation(trailProgram, 'u_decay'),
    u_zoom: gl.getUniformLocation(trailProgram, 'u_zoom'),
    u_rotation: gl.getUniformLocation(trailProgram, 'u_rotation'),
  };

  const compositeUniforms = {
    u_texture: gl.getUniformLocation(compositeProgram, 'u_texture'),
    u_resolution: gl.getUniformLocation(compositeProgram, 'u_resolution'),
    u_glowIntensity: gl.getUniformLocation(compositeProgram, 'u_glowIntensity'),
  };

  // Create ping-pong framebuffers
  const fbA = gl.createFramebuffer();
  const fbB = gl.createFramebuffer();
  if (!fbA || !fbB) throw new Error('Failed to create oscillo framebuffers');

  const texA = gl.createTexture();
  const texB = gl.createTexture();
  if (!texA || !texB) throw new Error('Failed to create oscillo textures');

  // Setup textures
  for (const tex of [texA, texB]) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // Attach textures to framebuffers
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbA);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texB, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // Create VAO for quad (trail and composite passes)
  const quadVao = gl.createVertexArray();
  if (!quadVao) throw new Error('Failed to create oscillo quad VAO');
  gl.bindVertexArray(quadVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  const quadPosLoc = gl.getAttribLocation(trailProgram, 'a_position');
  gl.enableVertexAttribArray(quadPosLoc);
  gl.vertexAttribPointer(quadPosLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Create VAO for line (waveform)
  const lineVao = gl.createVertexArray();
  if (!lineVao) throw new Error('Failed to create oscillo line VAO');
  gl.bindVertexArray(lineVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  const linePosLoc = gl.getAttribLocation(lineProgram, 'a_position');
  gl.enableVertexAttribArray(linePosLoc);
  gl.vertexAttribPointer(linePosLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Allocate audio data buffers
  const waveformData = new Float32Array(numSamples);
  const frequencyData = new Uint8Array(numSamples);
  const lineVertices = new Float32Array(numSamples * 2);

  return {
    lineProgram,
    trailProgram,
    compositeProgram,
    lineUniforms,
    trailUniforms,
    compositeUniforms,
    quadVao,
    quadBuffer,
    lineVao,
    lineBuffer,
    fbA,
    fbB,
    texA,
    texB,
    current: 'A',
    waveformData,
    frequencyData,
    lineVertices,
    trailRotation: 0,
    energyHistory: [],
    lastBeatTime: 0,
  };
}

// Create lava resources for metaball rendering
function createLavaResources(gl: WebGL2RenderingContext, width: number, height: number): LavaResources {
  const cfg = CONFIG.lava;

  // Create low-res framebuffer
  const lowResWidth = Math.floor(width * cfg.renderScale);
  const lowResHeight = Math.floor(height * cfg.renderScale);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Failed to create lava framebuffer');

  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create lava texture');

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lowResWidth, lowResHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // Create fullscreen quad
  const quadVertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const quadBuffer = gl.createBuffer();
  if (!quadBuffer) throw new Error('Failed to create lava quad buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

  // Create programs
  const metaballProgram = createProgram(gl, QUAD_VERTEX, LAVA_METABALL_FRAGMENT);
  const upscaleProgram = createProgram(gl, QUAD_VERTEX, LAVA_UPSCALE_FRAGMENT);

  // Get uniform locations
  const metaballUniforms = {
    u_resolution: gl.getUniformLocation(metaballProgram, 'u_resolution'),
    u_numMetaballs: gl.getUniformLocation(metaballProgram, 'u_numMetaballs'),
    u_metaballPositions: gl.getUniformLocation(metaballProgram, 'u_metaballPositions'),
    u_metaballRadii: gl.getUniformLocation(metaballProgram, 'u_metaballRadii'),
    u_metaballColors: gl.getUniformLocation(metaballProgram, 'u_metaballColors'),
    u_threshold: gl.getUniformLocation(metaballProgram, 'u_threshold'),
    u_edgeSharpness: gl.getUniformLocation(metaballProgram, 'u_edgeSharpness'),
    u_glowIntensity: gl.getUniformLocation(metaballProgram, 'u_glowIntensity'),
  };

  const upscaleUniforms = {
    u_texture: gl.getUniformLocation(upscaleProgram, 'u_texture'),
    u_resolution: gl.getUniformLocation(upscaleProgram, 'u_resolution'),
  };

  // Create VAO for quad
  const quadVao = gl.createVertexArray();
  if (!quadVao) throw new Error('Failed to create lava VAO');
  gl.bindVertexArray(quadVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  const posLoc = gl.getAttribLocation(metaballProgram, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Initialize metaballs
  const metaballs: LavaMetaball[] = [];
  for (let i = 0; i < cfg.metaballCount; i++) {
    const baseRadius = cfg.radiusMin + Math.random() * (cfg.radiusMax - cfg.radiusMin);
    metaballs.push({
      x: (Math.random() - 0.5) * 1.5,
      y: (Math.random() - 0.5) * 2.0,
      vx: (Math.random() - 0.5) * cfg.horizontalDrift * 2,
      vy: cfg.baseSpeed * (0.8 + Math.random() * 0.4),
      radius: baseRadius,
      baseRadius,
      phase: Math.random() * Math.PI * 2,
      colorType: i % 2 === 0 ? 'magenta' : 'cyan',
    });
  }

  return {
    metaballProgram,
    upscaleProgram,
    framebuffer,
    texture,
    lowResWidth,
    lowResHeight,
    quadVao,
    quadBuffer,
    metaballUniforms,
    upscaleUniforms,
    metaballs,
    lastTime: performance.now(),
  };
}

// Create particles for a given style - count based on screen size
// Note: quasar, oscillo, and lava styles don't use particles (they're fullscreen shaders)
function createParticles(style: string, width: number, height: number): Particle[] {
  // Fullscreen shader styles - no particles needed
  if (style === 'quasar' || style === 'oscillo' || style === 'lava') {
    return [];
  }

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
    const baseSize = getSizeForStyle(style, sizeScale);

    // Color interpolation between cyan and pink
    const { r, g, b } = interpolateColor(Math.random());

    // Alpha values from config
    const alpha = getAlphaForStyle(style);

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
      const baseSize = randomInRange(cfg.largeSizeMin, cfg.largeSizeMax) * sizeScale;

      // Color interpolation
      const { r, g, b } = interpolateColor(Math.random());

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
    orbs: createParticleProgram(gl, ORBS_FRAGMENT),
    stars: createParticleProgram(gl, STARS_FRAGMENT),
    trails: createParticleProgram(gl, TRAILS_FRAGMENT),
  };

  // Create particles
  const particles = createParticles(style, canvas.width, canvas.height);

  // Create buffers (with null checks for WebGL context loss)
  const positionBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const vao = gl.createVertexArray();

  if (!positionBuffer || !sizeBuffer || !colorBuffer || !vao) {
    throw new Error('Failed to create WebGL buffers - context may be lost');
  }
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

  // Get uniform locations (for particle-based styles only)
  // Quasar and oscillo have their own uniforms in their respective resources
  const isFullscreenStyle = style === 'quasar' || style === 'oscillo' || style === 'lava';
  const program = !isFullscreenStyle ? programs[style] : programs['orbs']; // fallback for type safety
  const uniforms = !isFullscreenStyle ? {
    u_resolution: gl.getUniformLocation(program, 'u_resolution'),
    u_bass: gl.getUniformLocation(program, 'u_bass'),
    u_time: gl.getUniformLocation(program, 'u_time'),
  } : {
    u_resolution: null,
    u_bass: null,
    u_time: null,
  };

  // Create style-specific resources if needed
  const trailFramebuffers = style === 'trails'
    ? createTrailFramebuffers(gl, canvas.width, canvas.height)
    : undefined;
  const quadResources = style === 'trails'
    ? createQuadResources(gl)
    : undefined;
  const quasarResources = style === 'quasar'
    ? createQuasarResources(gl, canvas.width, canvas.height)
    : undefined;
  const oscilloResources = style === 'oscillo'
    ? createOscilloResources(gl, canvas.width, canvas.height)
    : undefined;
  const lavaResources = style === 'lava'
    ? createLavaResources(gl, canvas.width, canvas.height)
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
    quasarResources,
    oscilloResources,
    lavaResources,
  };

  // Initial buffer upload (skip for fullscreen shader styles which have no particles)
  if (!isFullscreenStyle) {
    uploadParticleData(ctx);
  }

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

    // Recreate framebuffer on resize for quasar
    if (ctx.currentStyle === 'quasar' && ctx.quasarResources) {
      // Clean up old framebuffer and texture
      gl.deleteFramebuffer(ctx.quasarResources.framebuffer);
      gl.deleteTexture(ctx.quasarResources.texture);

      // Create new framebuffer and texture at new size
      const framebuffer = gl.createFramebuffer();
      const texture = gl.createTexture();
      if (framebuffer && texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        ctx.quasarResources.framebuffer = framebuffer;
        ctx.quasarResources.texture = texture;
      }
    }

    // Recreate framebuffer on resize for lava
    if (ctx.currentStyle === 'lava' && ctx.lavaResources) {
      const cfg = CONFIG.lava;
      const lowResWidth = Math.floor(canvas.width * cfg.renderScale);
      const lowResHeight = Math.floor(canvas.height * cfg.renderScale);

      // Clean up old framebuffer and texture
      gl.deleteFramebuffer(ctx.lavaResources.framebuffer);
      gl.deleteTexture(ctx.lavaResources.texture);

      // Create new framebuffer and texture at new size
      const framebuffer = gl.createFramebuffer();
      const texture = gl.createTexture();
      if (framebuffer && texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lowResWidth, lowResHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        ctx.lavaResources.framebuffer = framebuffer;
        ctx.lavaResources.texture = texture;
        ctx.lavaResources.lowResWidth = lowResWidth;
        ctx.lavaResources.lowResHeight = lowResHeight;
      }
    }
  };

  // Store handler for cleanup and add listener
  ctx.resizeHandler = resizeHandler;
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

    // Quasar uses fullscreen shader rendering
    if (currentStyle === 'quasar' && ctx.quasarResources) {
      renderQuasar(ctx, time);
    }
    // Oscillo uses fullscreen shader with zoom/rotation trails
    else if (currentStyle === 'oscillo' && ctx.oscilloResources) {
      renderOscillo(ctx, time);
    }
    // Lava uses metaball rendering with low-res upscale
    else if (currentStyle === 'lava' && ctx.lavaResources) {
      renderLava(ctx, time);
    }
    // Trails use special framebuffer ping-pong technique
    else if (currentStyle === 'trails' && ctx.trailFramebuffers && ctx.quadResources) {
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

// Render quasar fullscreen shader with bloom post-processing
function renderQuasar(ctx: ShaderContext, time: number): void {
  const { gl, canvas, lastAudio, quasarResources } = ctx;

  if (!quasarResources) return;

  const cfg = CONFIG.quasar;

  // Step 1: Render quasar to framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, quasarResources.framebuffer);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Disable blending for first pass (clean render to texture)
  gl.disable(gl.BLEND);

  gl.useProgram(quasarResources.program);

  // Set quasar uniforms
  const u = quasarResources.uniforms;
  gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(u.u_time, time);
  gl.uniform1f(u.u_scale, cfg.scale);
  gl.uniform1f(u.u_orbitRadius, cfg.orbitRadius);
  gl.uniform1f(u.u_edgeWidth, cfg.edgeWidth);
  gl.uniform1f(u.u_glowIntensity, cfg.glowIntensity);
  gl.uniform1f(u.u_dotSize, cfg.dotSize);
  gl.uniform1f(u.u_bassReactivity, cfg.bassReactivity);
  gl.uniform1f(u.u_bass, lastAudio.bass);

  // Draw quasar to framebuffer
  gl.bindVertexArray(quasarResources.vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Step 2: Apply bloom and render to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Enable normal alpha blending for final composite
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(quasarResources.bloomProgram);

  // Bind quasar texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, quasarResources.texture);

  // Set bloom uniforms
  const b = quasarResources.bloomUniforms;
  gl.uniform1i(b.u_texture, 0);
  gl.uniform2f(b.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(b.u_bloomRadius, cfg.bloomRadius);
  gl.uniform1f(b.u_bloomIntensity, cfg.bloomIntensity);

  // Draw fullscreen quad with bloom
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}

// Beat detection for oscillo rotation
function detectOscilloBeat(analyser: AnalyserNode, resources: OscilloResources, now: number): boolean {
  const cfg = CONFIG.oscillo;

  // Get frequency data for energy calculation
  analyser.getByteFrequencyData(resources.frequencyData);

  // Calculate bass energy (bins 1-10, ~20-200Hz)
  let energy = 0;
  for (let i = 1; i <= 10; i++) {
    energy += resources.frequencyData[i] * resources.frequencyData[i];
  }
  energy /= 10;

  // Update history
  resources.energyHistory.push(energy);
  if (resources.energyHistory.length > 43) {
    resources.energyHistory.shift();
  }

  // Need enough history for comparison
  if (resources.energyHistory.length < 10) return false;

  // Compare to average
  const avg = resources.energyHistory.reduce((a, b) => a + b, 0) / resources.energyHistory.length;
  const isBeat = energy > avg * cfg.beatThreshold;
  const timeSince = now - resources.lastBeatTime;

  if (isBeat && timeSince > cfg.beatMinInterval) {
    resources.lastBeatTime = now;
    return true;
  }

  return false;
}

// Render oscillo with zoom/rotation trails
function renderOscillo(ctx: ShaderContext, time: number): void {
  const { gl, canvas, oscilloResources } = ctx;
  const analyser = window.__scopeAnalyser;

  if (!oscilloResources) return;

  const cfg = CONFIG.oscillo;
  const now = performance.now();

  // Get waveform data from analyser (if available)
  if (analyser) {
    // Use a subset of the analyser's buffer for our 512 samples
    const fullBuffer = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(fullBuffer);

    // Downsample to our buffer size
    const ratio = fullBuffer.length / oscilloResources.waveformData.length;
    for (let i = 0; i < oscilloResources.waveformData.length; i++) {
      oscilloResources.waveformData[i] = fullBuffer[Math.floor(i * ratio)];
    }

    // Beat detection - add rotation impulse on each beat
    if (detectOscilloBeat(analyser, oscilloResources, now)) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      oscilloResources.trailRotation += direction * cfg.rotationImpulse;
    }
  } else {
    // No analyser - generate a sine wave for visual feedback
    for (let i = 0; i < oscilloResources.waveformData.length; i++) {
      oscilloResources.waveformData[i] = Math.sin(i * 0.05 + time * 2) * 0.3;
    }
  }

  // Decay the trail rotation slowly (rotation persists and accumulates)
  oscilloResources.trailRotation *= cfg.rotationDecay;

  // Calculate color based on time - ping-pong between magenta and cyan
  const colorPhase = Math.sin(time * Math.PI * cfg.colorCycleSpeed) * 0.5 + 0.5;
  // Magenta: (1.0, 0.0, 1.0), Cyan: (0.0, 1.0, 1.0)
  const colorR = 1.0 - colorPhase;  // 1.0 at magenta, 0.0 at cyan
  const colorG = colorPhase;         // 0.0 at magenta, 1.0 at cyan
  const colorB = 1.0;                // Always 1.0

  // Convert waveform to vertex positions
  const numSamples = oscilloResources.waveformData.length;
  for (let i = 0; i < numSamples; i++) {
    const x = (i / (numSamples - 1)) * canvas.width;
    const y = canvas.height / 2 + oscilloResources.waveformData[i] * canvas.height * cfg.waveAmplitude;
    oscilloResources.lineVertices[i * 2] = x;
    oscilloResources.lineVertices[i * 2 + 1] = y;
  }

  // Upload line vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, oscilloResources.lineBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, oscilloResources.lineVertices);

  // Determine ping-pong buffers
  const srcTex = oscilloResources.current === 'A' ? oscilloResources.texB : oscilloResources.texA;
  const dstFb = oscilloResources.current === 'A' ? oscilloResources.fbA : oscilloResources.fbB;

  // PASS 1: Draw zoomed/rotated/faded previous frame to destination framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, dstFb);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);

  gl.useProgram(oscilloResources.trailProgram);

  // Bind previous frame texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, srcTex);

  // Set trail uniforms
  const t = oscilloResources.trailUniforms;
  gl.uniform1i(t.u_previousFrame, 0);
  gl.uniform2f(t.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(t.u_decay, cfg.trailDecay);
  gl.uniform1f(t.u_zoom, cfg.zoomSpeed);
  gl.uniform1f(t.u_rotation, oscilloResources.trailRotation);

  // Draw fullscreen quad
  gl.bindVertexArray(oscilloResources.quadVao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // PASS 2: Draw oscilloscope line on top (additive blend)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  gl.useProgram(oscilloResources.lineProgram);

  // Set line uniforms
  const l = oscilloResources.lineUniforms;
  gl.uniform2f(l.u_resolution, canvas.width, canvas.height);
  gl.uniform3f(l.u_color, colorR, colorG, colorB); // Ping-pong magenta to cyan
  gl.uniform1f(l.u_glowIntensity, cfg.glowIntensity);

  // Draw line strip
  gl.bindVertexArray(oscilloResources.lineVao);
  gl.drawArrays(gl.LINE_STRIP, 0, numSamples);

  // Swap buffers
  oscilloResources.current = oscilloResources.current === 'A' ? 'B' : 'A';

  // PASS 3: Composite to screen with glow
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(oscilloResources.compositeProgram);

  // Bind accumulated trail texture (destination from passes 1 & 2)
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, oscilloResources.current === 'A' ? oscilloResources.texB : oscilloResources.texA);

  // Set composite uniforms
  const c = oscilloResources.compositeUniforms;
  gl.uniform1i(c.u_texture, 0);
  gl.uniform2f(c.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(c.u_glowIntensity, cfg.glowIntensity);

  // Draw fullscreen quad
  gl.bindVertexArray(oscilloResources.quadVao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}

// Render lava lamp metaballs
function renderLava(ctx: ShaderContext, time: number): void {
  const { gl, canvas, lavaResources, lastAudio } = ctx;

  if (!lavaResources) return;

  const cfg = CONFIG.lava;
  const now = performance.now();
  const deltaTime = (now - lavaResources.lastTime) / 1000;
  lavaResources.lastTime = now;

  // Calculate speed multiplier based on bass
  const speedMultiplier = 1.0 + lastAudio.bass * cfg.bassSpeedBoost;

  // Update metaball physics
  for (const ball of lavaResources.metaballs) {
    // Apply velocity (scaled by bass)
    ball.x += ball.vx * deltaTime * speedMultiplier * 0.5;
    ball.y += ball.vy * deltaTime * speedMultiplier;

    // Wrap vertically (seamless loop)
    if (ball.y > 1.5) {
      ball.y = -1.5;
      ball.x = (Math.random() - 0.5) * 1.5;
      ball.vx = (Math.random() - 0.5) * cfg.horizontalDrift * 2;
    }
    if (ball.y < -1.5) {
      ball.y = 1.5;
      ball.x = (Math.random() - 0.5) * 1.5;
      ball.vx = (Math.random() - 0.5) * cfg.horizontalDrift * 2;
    }

    // Bounce horizontally
    if (Math.abs(ball.x) > 1.2) {
      ball.vx *= -0.8;
      ball.x = Math.sign(ball.x) * 1.2;
    }

    // Size pulsing (reacts to bass)
    ball.phase += deltaTime * cfg.pulseSpeed * speedMultiplier;
    const pulse = Math.sin(ball.phase) * cfg.pulseAmount;
    const bassBoost = lastAudio.bass * cfg.bassRadiusBoost;
    ball.radius = ball.baseRadius + pulse + bassBoost;

    // Gentle damping
    ball.vx *= 0.995;
  }

  // Prepare uniform data
  const positions = new Float32Array(lavaResources.metaballs.length * 2);
  const radii = new Float32Array(lavaResources.metaballs.length);
  const colors = new Float32Array(lavaResources.metaballs.length * 3);

  for (let i = 0; i < lavaResources.metaballs.length; i++) {
    const ball = lavaResources.metaballs[i];
    positions[i * 2] = ball.x;
    positions[i * 2 + 1] = ball.y;
    radii[i] = ball.radius;

    if (ball.colorType === 'magenta') {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.0;
      colors[i * 3 + 2] = 1.0;
    } else {
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
    }
  }

  // PASS 1: Render metaballs to low-res framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, lavaResources.framebuffer);
  gl.viewport(0, 0, lavaResources.lowResWidth, lavaResources.lowResHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.disable(gl.BLEND);

  gl.useProgram(lavaResources.metaballProgram);

  const m = lavaResources.metaballUniforms;
  gl.uniform2f(m.u_resolution, lavaResources.lowResWidth, lavaResources.lowResHeight);
  gl.uniform1i(m.u_numMetaballs, lavaResources.metaballs.length);
  gl.uniform2fv(m.u_metaballPositions, positions);
  gl.uniform1fv(m.u_metaballRadii, radii);
  gl.uniform3fv(m.u_metaballColors, colors);
  gl.uniform1f(m.u_threshold, cfg.threshold);
  gl.uniform1f(m.u_edgeSharpness, cfg.edgeSharpness);
  gl.uniform1f(m.u_glowIntensity, cfg.glowIntensity);

  gl.bindVertexArray(lavaResources.quadVao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // PASS 2: Upscale to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(lavaResources.upscaleProgram);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, lavaResources.texture);

  const u = lavaResources.upscaleUniforms;
  gl.uniform1i(u.u_texture, 0);
  gl.uniform2f(u.u_resolution, canvas.width, canvas.height);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}

// Update particles - called at musical time intervals, not every frame
export function updateShader(ctx: ShaderContext, audio: AudioData): void {
  ctx.lastAudio = audio;
  ctx.isIdle = false;

  const { particles, canvas, currentStyle } = ctx;

  // Fullscreen shader styles have no particles - audio reactivity is handled in render functions
  if (currentStyle === 'quasar' || currentStyle === 'oscillo' || currentStyle === 'lava') {
    return;
  }

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
    const { r, g, b } = interpolateColor(colorT);
    p.r = r;
    p.g = g;
    p.b = b;
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
  const wasVoronoi = ctx.currentStyle === 'quasar';
  const wasOscillo = ctx.currentStyle === 'oscillo';
  const wasLava = ctx.currentStyle === 'lava';
  const willBeTrails = style === 'trails';
  const willBeVoronoi = style === 'quasar';
  const willBeOscillo = style === 'oscillo';
  const willBeLava = style === 'lava';

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

  // Clean up old quasar resources if switching away from quasar
  if (wasVoronoi && ctx.quasarResources) {
    gl.deleteProgram(ctx.quasarResources.program);
    gl.deleteProgram(ctx.quasarResources.bloomProgram);
    gl.deleteVertexArray(ctx.quasarResources.vao);
    gl.deleteBuffer(ctx.quasarResources.buffer);
    gl.deleteFramebuffer(ctx.quasarResources.framebuffer);
    gl.deleteTexture(ctx.quasarResources.texture);
    ctx.quasarResources = undefined;
  }

  // Clean up old oscillo resources if switching away from oscillo
  if (wasOscillo && ctx.oscilloResources) {
    gl.deleteProgram(ctx.oscilloResources.lineProgram);
    gl.deleteProgram(ctx.oscilloResources.trailProgram);
    gl.deleteProgram(ctx.oscilloResources.compositeProgram);
    gl.deleteVertexArray(ctx.oscilloResources.quadVao);
    gl.deleteVertexArray(ctx.oscilloResources.lineVao);
    gl.deleteBuffer(ctx.oscilloResources.quadBuffer);
    gl.deleteBuffer(ctx.oscilloResources.lineBuffer);
    gl.deleteFramebuffer(ctx.oscilloResources.fbA);
    gl.deleteFramebuffer(ctx.oscilloResources.fbB);
    gl.deleteTexture(ctx.oscilloResources.texA);
    gl.deleteTexture(ctx.oscilloResources.texB);
    ctx.oscilloResources = undefined;
  }

  // Clean up old lava resources if switching away from lava
  if (wasLava && ctx.lavaResources) {
    gl.deleteProgram(ctx.lavaResources.metaballProgram);
    gl.deleteProgram(ctx.lavaResources.upscaleProgram);
    gl.deleteVertexArray(ctx.lavaResources.quadVao);
    gl.deleteBuffer(ctx.lavaResources.quadBuffer);
    gl.deleteFramebuffer(ctx.lavaResources.framebuffer);
    gl.deleteTexture(ctx.lavaResources.texture);
    ctx.lavaResources = undefined;
  }

  // Create trail resources if switching to trails
  if (willBeTrails && !ctx.trailFramebuffers) {
    ctx.trailFramebuffers = createTrailFramebuffers(gl, canvas.width, canvas.height);
    ctx.quadResources = createQuadResources(gl);
  }

  // Create quasar resources if switching to quasar
  if (willBeVoronoi && !ctx.quasarResources) {
    ctx.quasarResources = createQuasarResources(gl, canvas.width, canvas.height);
  }

  // Create oscillo resources if switching to oscillo
  if (willBeOscillo && !ctx.oscilloResources) {
    ctx.oscilloResources = createOscilloResources(gl, canvas.width, canvas.height);
  }

  // Create lava resources if switching to lava
  if (willBeLava && !ctx.lavaResources) {
    ctx.lavaResources = createLavaResources(gl, canvas.width, canvas.height);
  }

  // Recreate particles for new style (fullscreen styles return empty array)
  ctx.particles = createParticles(style, canvas.width, canvas.height);
  ctx.currentStyle = style;

  // Reallocate pre-allocated arrays for new particle count
  ctx.positionData = new Float32Array(ctx.particles.length * 2);
  ctx.sizeData = new Float32Array(ctx.particles.length);
  ctx.colorData = new Float32Array(ctx.particles.length * 4);

  // Skip particle buffer setup for fullscreen styles (they use fullscreen shaders, no particles)
  const isFullscreenStyle = willBeVoronoi || willBeOscillo || willBeLava;
  if (!isFullscreenStyle) {
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

    // Upload initial data for particle-based styles
    uploadParticleData(ctx);
  }
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

  // Remove resize listener to prevent memory leaks
  if (ctx.resizeHandler) {
    window.removeEventListener('resize', ctx.resizeHandler);
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

  // Clean up quasar resources
  if (ctx.quasarResources) {
    gl.deleteProgram(ctx.quasarResources.program);
    gl.deleteProgram(ctx.quasarResources.bloomProgram);
    gl.deleteVertexArray(ctx.quasarResources.vao);
    gl.deleteBuffer(ctx.quasarResources.buffer);
    gl.deleteFramebuffer(ctx.quasarResources.framebuffer);
    gl.deleteTexture(ctx.quasarResources.texture);
  }

  // Clean up oscillo resources
  if (ctx.oscilloResources) {
    gl.deleteProgram(ctx.oscilloResources.lineProgram);
    gl.deleteProgram(ctx.oscilloResources.trailProgram);
    gl.deleteProgram(ctx.oscilloResources.compositeProgram);
    gl.deleteVertexArray(ctx.oscilloResources.quadVao);
    gl.deleteVertexArray(ctx.oscilloResources.lineVao);
    gl.deleteBuffer(ctx.oscilloResources.quadBuffer);
    gl.deleteBuffer(ctx.oscilloResources.lineBuffer);
    gl.deleteFramebuffer(ctx.oscilloResources.fbA);
    gl.deleteFramebuffer(ctx.oscilloResources.fbB);
    gl.deleteTexture(ctx.oscilloResources.texA);
    gl.deleteTexture(ctx.oscilloResources.texB);
  }

  // Clean up lava resources
  if (ctx.lavaResources) {
    gl.deleteProgram(ctx.lavaResources.metaballProgram);
    gl.deleteProgram(ctx.lavaResources.upscaleProgram);
    gl.deleteVertexArray(ctx.lavaResources.quadVao);
    gl.deleteBuffer(ctx.lavaResources.quadBuffer);
    gl.deleteFramebuffer(ctx.lavaResources.framebuffer);
    gl.deleteTexture(ctx.lavaResources.texture);
  }
}
