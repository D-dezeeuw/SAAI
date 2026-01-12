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
  OSCILLO_THICK_LINE_VERTEX,
  OSCILLO_LINE_FRAGMENT,
  OSCILLO_TRAIL_FRAGMENT,
  OSCILLO_COMPOSITE_FRAGMENT,
  LAVA_METABALL_FRAGMENT,
  LAVA_METABALL_FRAGMENT_MOBILE,
  LAVA_UPSCALE_FRAGMENT,
  LAVA_GLOW_FRAGMENT,
} from './shaderSources';
import { MOBILE_BREAKPOINT, MOBILE_MAX_METABALLS } from '../config/constants';
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
    u_bassReactivity: WebGLUniformLocation | null;
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
  // Eased audio reactivity (like lava)
  smoothedBass: number;
  lastTime: number;
  // Beat detection (like oscillo)
  frequencyData: Uint8Array;
  energyHistory: number[];
  lastBeatTime: number;
  beatBoost: number;
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
    u_lineWidth: WebGLUniformLocation | null;
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
  lineNormalBuffer: WebGLBuffer;
  lineVertexCount: number;
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
  lineNormals: Float32Array;
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
  glowProgram: WebGLProgram;
  // Framebuffer for low-res rendering
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  lowResWidth: number;
  lowResHeight: number;
  // Glow framebuffer (even lower res for blur effect)
  glowFramebuffer: WebGLFramebuffer;
  glowTexture: WebGLTexture;
  glowWidth: number;
  glowHeight: number;
  // Geometry
  quadVao: WebGLVertexArrayObject;
  quadBuffer: WebGLBuffer;
  // Eased audio reactivity
  smoothedBass: number;
  // Uniforms
  metaballUniforms: {
    u_resolution: WebGLUniformLocation | null;
    u_numMetaballs: WebGLUniformLocation | null;
    u_metaballPositions: WebGLUniformLocation | null;
    u_metaballRadii: WebGLUniformLocation | null;
    u_metaballColors: WebGLUniformLocation | null;
    u_metaballTypes: WebGLUniformLocation | null;
    u_threshold: WebGLUniformLocation | null;
    u_edgeSharpness: WebGLUniformLocation | null;
    u_glowIntensity: WebGLUniformLocation | null;
    u_debug: WebGLUniformLocation | null;
  };
  upscaleUniforms: {
    u_texture: WebGLUniformLocation | null;
    u_resolution: WebGLUniformLocation | null;
    u_debugLines: WebGLUniformLocation | null;
  };
  glowUniforms: {
    u_texture: WebGLUniformLocation | null;
    u_resolution: WebGLUniformLocation | null;
    u_opacity: WebGLUniformLocation | null;
    u_brightness: WebGLUniformLocation | null;
    u_blurRadius: WebGLUniformLocation | null;
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

/**
 * Check if framebuffer is complete and ready for rendering
 * Returns true if complete, logs error and returns false otherwise
 */
function checkFramebufferComplete(gl: WebGL2RenderingContext, name: string): boolean {
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    const statusNames: Record<number, string> = {
      [gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT]: 'INCOMPLETE_ATTACHMENT',
      [gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT]: 'INCOMPLETE_MISSING_ATTACHMENT',
      [gl.FRAMEBUFFER_UNSUPPORTED]: 'UNSUPPORTED',
    };
    console.error(`[Shader] Framebuffer '${name}' incomplete: ${statusNames[status] || status}`);
    return false;
  }
  return true;
}

/**
 * Detect if the current device is mobile
 */
function isMobileDevice(): boolean {
  return window.innerWidth <= MOBILE_BREAKPOINT ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Generate triangle strip geometry for thick line rendering
 * Creates 2 vertices per sample point (top and bottom of line thickness)
 */
function generateThickLineVertices(
  waveformData: Float32Array,
  width: number,
  height: number,
  amplitude: number,
  positions: Float32Array,
  normals: Float32Array
): void {
  const numSamples = waveformData.length;
  const centerY = height * 0.5;

  for (let i = 0; i < numSamples; i++) {
    const x = (i / (numSamples - 1)) * width;
    const y = centerY + waveformData[i] * height * amplitude;

    // Calculate tangent direction from adjacent samples
    let dx = 1, dy = 0;
    if (i > 0 && i < numSamples - 1) {
      const prevY = centerY + waveformData[i - 1] * height * amplitude;
      const nextY = centerY + waveformData[i + 1] * height * amplitude;
      dx = 2 / (numSamples - 1) * width;
      dy = nextY - prevY;
    } else if (i === 0 && numSamples > 1) {
      const nextY = centerY + waveformData[1] * height * amplitude;
      dy = nextY - y;
    } else if (i === numSamples - 1 && numSamples > 1) {
      const prevY = centerY + waveformData[numSamples - 2] * height * amplitude;
      dy = y - prevY;
    }

    // Normalize and get perpendicular (normal)
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? -dy / len : 0;
    const ny = len > 0 ? dx / len : 1;

    // Two vertices per sample: top (+normal) and bottom (-normal)
    const idx = i * 4;
    positions[idx] = x;
    positions[idx + 1] = y;
    normals[idx] = nx;
    normals[idx + 1] = ny;

    positions[idx + 2] = x;
    positions[idx + 3] = y;
    normals[idx + 2] = -nx;
    normals[idx + 3] = -ny;
  }
}

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
    // Eased audio reactivity
    smoothedBass: 0,
    lastTime: performance.now(),
    // Beat detection
    frequencyData: new Uint8Array(2048),
    energyHistory: [],
    lastBeatTime: 0,
    beatBoost: 0,
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

  // Create line buffers for thick line rendering (triangle strip)
  // Using 512 samples for waveform visualization, 2 vertices per sample
  const numSamples = 512;
  const lineVertexCount = numSamples * 2;

  const lineBuffer = gl.createBuffer();
  if (!lineBuffer) throw new Error('Failed to create oscillo line buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertexCount * 2), gl.DYNAMIC_DRAW);

  // Normal buffer for thick line rendering
  const lineNormalBuffer = gl.createBuffer();
  if (!lineNormalBuffer) throw new Error('Failed to create oscillo line normal buffer');
  gl.bindBuffer(gl.ARRAY_BUFFER, lineNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertexCount * 2), gl.DYNAMIC_DRAW);

  // Create programs - use thick line shader for mobile compatibility
  const lineProgram = createProgram(gl, OSCILLO_THICK_LINE_VERTEX, OSCILLO_LINE_FRAGMENT);
  const trailProgram = createProgram(gl, QUAD_VERTEX, OSCILLO_TRAIL_FRAGMENT);
  const compositeProgram = createProgram(gl, QUAD_VERTEX, OSCILLO_COMPOSITE_FRAGMENT);

  // Get uniform locations
  const lineUniforms = {
    u_resolution: gl.getUniformLocation(lineProgram, 'u_resolution'),
    u_color: gl.getUniformLocation(lineProgram, 'u_color'),
    u_glowIntensity: gl.getUniformLocation(lineProgram, 'u_glowIntensity'),
    u_lineWidth: gl.getUniformLocation(lineProgram, 'u_lineWidth'),
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

  // Attach textures to framebuffers with validation
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbA);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);
  if (!checkFramebufferComplete(gl, 'oscillo-A')) {
    throw new Error('Oscillo framebuffer A creation failed');
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texB, 0);
  if (!checkFramebufferComplete(gl, 'oscillo-B')) {
    throw new Error('Oscillo framebuffer B creation failed');
  }

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

  // Create VAO for thick line (waveform as triangle strip)
  const lineVao = gl.createVertexArray();
  if (!lineVao) throw new Error('Failed to create oscillo line VAO');
  gl.bindVertexArray(lineVao);

  // Position attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  const linePosLoc = gl.getAttribLocation(lineProgram, 'a_position');
  gl.enableVertexAttribArray(linePosLoc);
  gl.vertexAttribPointer(linePosLoc, 2, gl.FLOAT, false, 0, 0);

  // Normal attribute for line thickness
  gl.bindBuffer(gl.ARRAY_BUFFER, lineNormalBuffer);
  const lineNormalLoc = gl.getAttribLocation(lineProgram, 'a_normal');
  gl.enableVertexAttribArray(lineNormalLoc);
  gl.vertexAttribPointer(lineNormalLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  // Allocate audio data buffers
  const waveformData = new Float32Array(numSamples);
  // Use 2048 for frequency data to accommodate any analyser FFT size
  const frequencyData = new Uint8Array(2048);
  // Thick line needs 2 vertices per sample, each with x,y
  const lineVertices = new Float32Array(lineVertexCount * 2);
  const lineNormals = new Float32Array(lineVertexCount * 2);

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
    lineNormalBuffer,
    lineVertexCount,
    fbA,
    fbB,
    texA,
    texB,
    current: 'A',
    waveformData,
    frequencyData,
    lineVertices,
    lineNormals,
    trailRotation: 0,
    energyHistory: [],
    lastBeatTime: 0,
  };
}

// Create lava resources for metaball rendering
function createLavaResources(gl: WebGL2RenderingContext, width: number, height: number): LavaResources {
  const cfg = CONFIG.lava;
  const isMobile = isMobileDevice();

  // Use reduced metaball count on mobile for GPU compatibility
  const maxMetaballs = isMobile ? MOBILE_MAX_METABALLS : cfg.metaballCount;

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

  // Validate framebuffer
  if (!checkFramebufferComplete(gl, 'lava')) {
    throw new Error('Lava framebuffer creation failed');
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  // Create glow framebuffer (even lower res for blur effect)
  const glowWidth = Math.floor(width * cfg.glowScale);
  const glowHeight = Math.floor(height * cfg.glowScale);

  const glowFramebuffer = gl.createFramebuffer();
  if (!glowFramebuffer) throw new Error('Failed to create glow framebuffer');

  const glowTexture = gl.createTexture();
  if (!glowTexture) throw new Error('Failed to create glow texture');

  gl.bindTexture(gl.TEXTURE_2D, glowTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, glowWidth, glowHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.bindFramebuffer(gl.FRAMEBUFFER, glowFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowTexture, 0);

  if (!checkFramebufferComplete(gl, 'lava-glow')) {
    throw new Error('Lava glow framebuffer creation failed');
  }

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

  // Create programs - use mobile shader on mobile devices
  const metaballShader = isMobile ? LAVA_METABALL_FRAGMENT_MOBILE : LAVA_METABALL_FRAGMENT;
  const metaballProgram = createProgram(gl, QUAD_VERTEX, metaballShader);
  const upscaleProgram = createProgram(gl, QUAD_VERTEX, LAVA_UPSCALE_FRAGMENT);
  const glowProgram = createProgram(gl, QUAD_VERTEX, LAVA_GLOW_FRAGMENT);

  // Get uniform locations
  const metaballUniforms = {
    u_resolution: gl.getUniformLocation(metaballProgram, 'u_resolution'),
    u_numMetaballs: gl.getUniformLocation(metaballProgram, 'u_numMetaballs'),
    u_metaballPositions: gl.getUniformLocation(metaballProgram, 'u_metaballPositions'),
    u_metaballRadii: gl.getUniformLocation(metaballProgram, 'u_metaballRadii'),
    u_metaballColors: gl.getUniformLocation(metaballProgram, 'u_metaballColors'),
    u_metaballTypes: gl.getUniformLocation(metaballProgram, 'u_metaballTypes'),
    u_threshold: gl.getUniformLocation(metaballProgram, 'u_threshold'),
    u_edgeSharpness: gl.getUniformLocation(metaballProgram, 'u_edgeSharpness'),
    u_glowIntensity: gl.getUniformLocation(metaballProgram, 'u_glowIntensity'),
    u_debug: gl.getUniformLocation(metaballProgram, 'u_debug'),
  };

  const upscaleUniforms = {
    u_texture: gl.getUniformLocation(upscaleProgram, 'u_texture'),
    u_resolution: gl.getUniformLocation(upscaleProgram, 'u_resolution'),
    u_debugLines: gl.getUniformLocation(upscaleProgram, 'u_debugLines'),
  };

  const glowUniforms = {
    u_texture: gl.getUniformLocation(glowProgram, 'u_texture'),
    u_resolution: gl.getUniformLocation(glowProgram, 'u_resolution'),
    u_opacity: gl.getUniformLocation(glowProgram, 'u_opacity'),
    u_brightness: gl.getUniformLocation(glowProgram, 'u_brightness'),
    u_blurRadius: gl.getUniformLocation(glowProgram, 'u_blurRadius'),
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

  // Initialize metaballs (reduced count on mobile)
  const metaballs: LavaMetaball[] = [];
  for (let i = 0; i < maxMetaballs; i++) {
    const baseRadius = cfg.radiusMin + Math.random() * (cfg.radiusMax - cfg.radiusMin);
    // Larger blobs move faster (Stokes' law: buoyancy ∝ r³, drag ∝ r²)
    // Normalize size: 0 = smallest, 1 = largest
    const normalizedSize = (baseRadius - cfg.radiusMin) / (cfg.radiusMax - cfg.radiusMin);
    // Speed factor: small = 0.6x, large = 1.4x
    const sizeFactor = 0.6 + normalizedSize * 0.8;
    metaballs.push({
      x: (Math.random() - 0.5) * 1.5,
      y: -1.1 - Math.random() * 0.2,  // Start at bottom (-1.1 to -1.3)
      vx: (Math.random() - 0.5) * cfg.horizontalDrift * 2,
      vy: Math.random() * 0.3,  // Random initial upward velocity (0 to 0.3)
      radius: baseRadius,
      baseRadius,
      phase: Math.random() * Math.PI * 2,
      colorType: i % 2 === 0 ? 'magenta' : 'cyan',
    });
  }

  return {
    metaballProgram,
    upscaleProgram,
    glowProgram,
    framebuffer,
    texture,
    lowResWidth,
    lowResHeight,
    glowFramebuffer,
    glowTexture,
    glowWidth,
    glowHeight,
    quadVao,
    quadBuffer,
    smoothedBass: 0,
    metaballUniforms,
    upscaleUniforms,
    glowUniforms,
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

  // Check if this is a fullscreen shader style (no particles needed)
  const isFullscreenStyle = style === 'quasar' || style === 'oscillo' || style === 'lava';

  // Create particles (empty for fullscreen styles)
  const particles = createParticles(style, canvas.width, canvas.height);

  // Create buffers (with null checks for WebGL context loss)
  // These are only used for particle-based styles, but we create them anyway for consistency
  const positionBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();
  const colorBuffer = gl.createBuffer();
  const vao = gl.createVertexArray();

  if (!positionBuffer || !sizeBuffer || !colorBuffer || !vao) {
    throw new Error('Failed to create WebGL buffers - context may be lost');
  }

  // Only setup particle attributes for particle-based styles
  if (!isFullscreenStyle) {
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
  }

  // Enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blending for glow

  // Get uniform locations (for particle-based styles only)
  // Quasar and oscillo have their own uniforms in their respective resources
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

    // Recreate framebuffers on resize for oscillo
    if (ctx.currentStyle === 'oscillo' && ctx.oscilloResources) {
      // Clean up old framebuffers and textures
      gl.deleteFramebuffer(ctx.oscilloResources.fbA);
      gl.deleteFramebuffer(ctx.oscilloResources.fbB);
      gl.deleteTexture(ctx.oscilloResources.texA);
      gl.deleteTexture(ctx.oscilloResources.texB);

      // Create new framebuffers at new size
      const fbA = gl.createFramebuffer();
      const fbB = gl.createFramebuffer();
      const texA = gl.createTexture();
      const texB = gl.createTexture();

      if (fbA && fbB && texA && texB) {
        // Setup textures
        for (const tex of [texA, texB]) {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
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

        ctx.oscilloResources.fbA = fbA;
        ctx.oscilloResources.fbB = fbB;
        ctx.oscilloResources.texA = texA;
        ctx.oscilloResources.texB = texB;
        ctx.oscilloResources.current = 'A';
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

// Beat detection for quasar (same pattern as oscillo)
function detectQuasarBeat(analyser: AnalyserNode, resources: QuasarResources, now: number): boolean {
  const cfg = CONFIG.quasar;

  // Get frequency data for energy calculation
  analyser.getByteFrequencyData(resources.frequencyData);

  // Calculate bass energy using bins 1-20 for bass drum detection
  let energy = 0;
  const bassEndBin = Math.min(20, resources.frequencyData.length - 1);
  for (let i = 1; i <= bassEndBin; i++) {
    // Weight lower frequencies more heavily (kick drum lives in bins 3-8)
    const weight = i <= 8 ? 2.0 : 1.0;
    energy += resources.frequencyData[i] * resources.frequencyData[i] * weight;
  }
  energy /= bassEndBin;

  // Update history (keep ~1 second of history at 60fps)
  resources.energyHistory.push(energy);
  if (resources.energyHistory.length > 60) {
    resources.energyHistory.shift();
  }

  // Need enough history for comparison
  if (resources.energyHistory.length < 15) return false;

  // Calculate average for adaptive threshold
  const avg = resources.energyHistory.reduce((a, b) => a + b, 0) / resources.energyHistory.length;

  // Check if current energy is a significant spike above average
  const isBeat = energy > avg * cfg.beatThreshold && energy > cfg.energyCutoff;
  const timeSince = now - resources.lastBeatTime;

  if (isBeat && timeSince > cfg.beatMinInterval) {
    resources.lastBeatTime = now;
    return true;
  }

  return false;
}

// Render quasar fullscreen shader with bloom post-processing
function renderQuasar(ctx: ShaderContext, time: number): void {
  const { gl, canvas, lastAudio, quasarResources } = ctx;

  if (!quasarResources) return;

  const cfg = CONFIG.quasar;
  const now = performance.now();
  const deltaTime = (now - quasarResources.lastTime) / 1000;
  quasarResources.lastTime = now;

  // Ease bass value for smooth reactivity (exponential smoothing - like lava)
  const easeAmount = 1 - Math.exp(-cfg.bassEaseSpeed * deltaTime);
  quasarResources.smoothedBass += (lastAudio.bass - quasarResources.smoothedBass) * easeAmount;

  // Beat detection - add impulse boost on beat
  const analyser = window.__scopeAnalyser;
  if (analyser && detectQuasarBeat(analyser, quasarResources, now)) {
    quasarResources.beatBoost = cfg.beatBoost;
  }

  // Decay beat boost over time
  quasarResources.beatBoost *= cfg.beatDecay;

  // Combined bass value: smoothed bass + beat boost
  const effectiveBass = quasarResources.smoothedBass + quasarResources.beatBoost;

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
  gl.uniform1f(u.u_bass, effectiveBass);

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

  // Calculate bass energy using more bins for better bass drum detection
  // Bins depend on sample rate and FFT size: bin_freq = bin_index * (sampleRate / fftSize)
  // For 44100Hz and 2048 FFT: each bin ≈ 21.5Hz
  // Bins 1-20 cover roughly 20-430Hz (kick drum fundamental is typically 60-100Hz)
  let energy = 0;
  const bassEndBin = Math.min(20, resources.frequencyData.length - 1);
  for (let i = 1; i <= bassEndBin; i++) {
    // Weight lower frequencies more heavily (kick drum lives in bins 3-8)
    const weight = i <= 8 ? 2.0 : 1.0;
    energy += resources.frequencyData[i] * resources.frequencyData[i] * weight;
  }
  energy /= bassEndBin;

  // Update history (keep ~1 second of history at 60fps)
  resources.energyHistory.push(energy);
  if (resources.energyHistory.length > 60) {
    resources.energyHistory.shift();
  }

  // Need enough history for comparison
  if (resources.energyHistory.length < 15) return false;

  // Calculate average and variance for adaptive threshold
  const avg = resources.energyHistory.reduce((a, b) => a + b, 0) / resources.energyHistory.length;

  // Check if current energy is a significant spike above average
  // energyCutoff prevents triggering on quiet passages
  const isBeat = energy > avg * cfg.beatThreshold && energy > cfg.energyCutoff;
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
      // Divide by 100 for friendlier config values
      const impulse = cfg.rotationImpulse / 100;
      const maxRot = cfg.maxRotation / 100;
      oscilloResources.trailRotation += direction * impulse;
      // Clamp rotation to prevent endless spinning
      oscilloResources.trailRotation = Math.max(-maxRot, Math.min(maxRot, oscilloResources.trailRotation));
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
  // Use a sharper transition to avoid desaturated white in the middle
  const rawPhase = Math.sin(time * Math.PI * cfg.colorCycleSpeed) * 0.5 + 0.5;
  // Smoothstep for sharper transition: t² * (3 - 2t)
  const sharpPhase = rawPhase * rawPhase * (3 - 2 * rawPhase);
  // Apply again for even sharper snap between colors
  const colorPhase = sharpPhase * sharpPhase * (3 - 2 * sharpPhase);
  // Magenta: (1.0, 0.0, 1.0), Cyan: (0.0, 1.0, 1.0)
  const colorR = 1.0 - colorPhase;
  const colorG = colorPhase;
  const colorB = 1.0;

  // Generate thick line geometry from waveform (triangle strip for mobile compatibility)
  generateThickLineVertices(
    oscilloResources.waveformData,
    canvas.width,
    canvas.height,
    cfg.waveAmplitude,
    oscilloResources.lineVertices,
    oscilloResources.lineNormals
  );

  // Upload position data
  gl.bindBuffer(gl.ARRAY_BUFFER, oscilloResources.lineBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, oscilloResources.lineVertices);

  // Upload normal data
  gl.bindBuffer(gl.ARRAY_BUFFER, oscilloResources.lineNormalBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, oscilloResources.lineNormals);

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
  gl.uniform1f(l.u_lineWidth, cfg.lineWidth);

  // Draw thick line as triangle strip (mobile compatible)
  gl.bindVertexArray(oscilloResources.lineVao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, oscilloResources.lineVertexCount);

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

  // Ease bass value for smooth reactivity (exponential smoothing)
  const easeAmount = 1 - Math.exp(-cfg.bassEaseSpeed * deltaTime);
  lavaResources.smoothedBass += (lastAudio.bass - lavaResources.smoothedBass) * easeAmount;

  // Calculate speed multiplier based on eased bass and global speed
  const speedMultiplier = cfg.globalSpeed * (1.0 + lavaResources.smoothedBass * cfg.bassSpeedBoost);

  // Update metaball physics
  for (const ball of lavaResources.metaballs) {
    // Size-based factors: larger blobs have more momentum (Stokes' law)
    const normalizedSize = (ball.baseRadius - cfg.radiusMin) / (cfg.radiusMax - cfg.radiusMin);
    const agilityFactor = 0.7 + normalizedSize * 0.6; // small = 0.7x, large = 1.3x

    // Thermal zone physics (lava lamp convection)
    // y ranges from -1.5 (bottom) to 1.5 (top)
    // Heating zone: bottom 1/3 (y < -0.5)
    // Cooling zone: top 2/3 (y >= -0.5)
    const heatingThreshold = -0.5;

    if (ball.y < heatingThreshold) {
      // Heating zone: accelerate upward (blobs get heated at bottom)
      const heatAmount = (heatingThreshold - ball.y) / 1.0; // 0 to 1
      ball.vy += heatAmount * deltaTime * cfg.heatIntensity * agilityFactor;
      // No forced minimum - let heating gradually reverse direction
    } else {
      // Cooling zone: very gradually slow down (reduced intensity for smoother transition)
      const coolAmount = (ball.y - heatingThreshold) / cfg.coolIntensity;
      ball.vy -= coolAmount * deltaTime * 0.2 * agilityFactor;
    }

    // Clamp vertical velocity
    ball.vy = Math.max(-0.3, Math.min(0.4, ball.vy));

    // Apply velocity (scaled by bass and size)
    ball.x += ball.vx * deltaTime * speedMultiplier * agilityFactor * 0.5;
    ball.y += ball.vy * deltaTime * speedMultiplier * agilityFactor;

    // Wrap vertically - lava lamp cycle (offset from screen edges by ~60px)
    if (ball.y > 1.35) {
      // Reached top, wrap to top and start sinking (cooled off)
      ball.y = 1.25;
      ball.x = (Math.random() - 0.5) * 1.5;
      ball.vx = (Math.random() - 0.5) * cfg.horizontalDrift * 2 * agilityFactor;
      ball.vy = -0.05; // Start sinking slowly
    }
    if (ball.y < -1.35) {
      // Fell to bottom, clamp and let heating push it back up
      ball.y = -1.25;
      ball.vy = 0.1; // Give initial upward push
    }

    // Bounce horizontally
    if (Math.abs(ball.x) > 1.2) {
      ball.vx *= -0.8;
      ball.x = Math.sign(ball.x) * 1.2;
    }

    // Size pulsing (reacts to eased bass)
    ball.phase += deltaTime * cfg.pulseSpeed * speedMultiplier;
    const pulse = Math.sin(ball.phase) * cfg.pulseAmount;
    const bassBoost = lavaResources.smoothedBass * cfg.bassRadiusBoost;
    ball.radius = ball.baseRadius + pulse + bassBoost;

    // Gentle damping (larger blobs have more momentum, less damping)
    ball.vx *= 0.998 - normalizedSize * 0.008; // small = 0.998, large = 0.99
  }

  // Prepare uniform data
  const positions = new Float32Array(lavaResources.metaballs.length * 2);
  const radii = new Float32Array(lavaResources.metaballs.length);
  const colors = new Float32Array(lavaResources.metaballs.length * 3);
  const types = new Int32Array(lavaResources.metaballs.length);

  for (let i = 0; i < lavaResources.metaballs.length; i++) {
    const ball = lavaResources.metaballs[i];
    positions[i * 2] = ball.x;
    positions[i * 2 + 1] = ball.y;
    radii[i] = ball.radius;

    if (ball.colorType === 'magenta') {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.0;
      colors[i * 3 + 2] = 1.0;
      types[i] = 0;  // magenta type
    } else {
      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
      types[i] = 1;  // cyan type
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
  gl.uniform1iv(m.u_metaballTypes, types);
  gl.uniform1f(m.u_threshold, cfg.threshold);
  gl.uniform1f(m.u_edgeSharpness, cfg.edgeSharpness);
  gl.uniform1f(m.u_glowIntensity, cfg.glowIntensity);
  gl.uniform1f(m.u_debug, 0.0);

  gl.bindVertexArray(lavaResources.quadVao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // PASS 1.5: Render metaballs to glow framebuffer (lower res, larger radii for spread)
  if (cfg.glowEnabled) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, lavaResources.glowFramebuffer);
    gl.viewport(0, 0, lavaResources.glowWidth, lavaResources.glowHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Use spread radii for glow
    const glowRadii = new Float32Array(radii.length);
    for (let i = 0; i < radii.length; i++) {
      glowRadii[i] = radii[i] * cfg.glowSpread;
    }

    gl.uniform2f(m.u_resolution, lavaResources.glowWidth, lavaResources.glowHeight);
    gl.uniform1fv(m.u_metaballRadii, glowRadii);
    gl.uniform1f(m.u_threshold, cfg.threshold * 0.8);  // Lower threshold for softer glow
    gl.uniform1f(m.u_edgeSharpness, cfg.edgeSharpness * 2.0);  // Softer edges

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // PASS 2: Render to screen
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // PASS 2a: Render glow first (underneath) with ADDITIVE blending
  if (cfg.glowEnabled) {
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);  // Additive blending - adds light

    gl.useProgram(lavaResources.glowProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lavaResources.glowTexture);

    const g = lavaResources.glowUniforms;
    gl.uniform1i(g.u_texture, 0);
    gl.uniform2f(g.u_resolution, lavaResources.glowWidth, lavaResources.glowHeight);
    gl.uniform1f(g.u_opacity, cfg.glowOpacity);
    gl.uniform1f(g.u_brightness, cfg.glowBrightness);
    gl.uniform1f(g.u_blurRadius, cfg.glowBlurRadius);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // PASS 2b: Render main metaballs on top with normal alpha blending
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(lavaResources.upscaleProgram);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, lavaResources.texture);

  const u = lavaResources.upscaleUniforms;
  gl.uniform1i(u.u_texture, 0);
  gl.uniform2f(u.u_resolution, canvas.width, canvas.height);
  gl.uniform1f(u.u_debugLines, 0.0);

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
    gl.deleteBuffer(ctx.oscilloResources.lineNormalBuffer);
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
    gl.deleteBuffer(ctx.oscilloResources.lineNormalBuffer);
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
