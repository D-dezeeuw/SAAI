// High-performance music-reactive particle system using point sprites
// Architecture: O(particles) instead of O(pixels × particles)

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
}

interface Buffers {
  position: WebGLBuffer;
  size: WebGLBuffer;
  color: WebGLBuffer;
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
}

// Colors
const CYAN = { r: 0.133, g: 0.827, b: 0.933 };
const PINK = { r: 0.925, g: 0.282, b: 0.600 };

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

  // Point size with bass pulse
  gl_PointSize = a_size * (1.0 + u_bass * 0.3);

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

  // Soft diffuse glow
  float glow = exp(-dist * dist * 2.0);
  // Subtle core
  float core = exp(-dist * dist * 6.0);

  float brightness = glow * 0.7 + core * 0.5;

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

// Fragment shader for flowing trails - vertically elongated with bright core
const TRAILS_FRAGMENT = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  vec2 coord = gl_PointCoord * 2.0 - 1.0;

  // Vertically elongated ellipse (fits in square point sprite)
  vec2 stretched = vec2(coord.x, coord.y * 0.35);
  float dist = length(stretched);

  if (dist > 1.0) discard;

  // Soft outer glow
  float glow = exp(-dist * dist * 1.2);
  // Bright hot core
  float core = exp(-dist * dist * 6.0);

  // Fade toward bottom (tail effect)
  float tailFade = 0.6 + 0.4 * (1.0 - gl_PointCoord.y);

  float brightness = (glow + core * 1.8) * tailFade;
  fragColor = vec4(v_color.rgb * brightness, v_color.a * brightness);
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

// Create particles for a given style - 10x particle counts for dense visuals
function createParticles(style: string, width: number, height: number): Particle[] {
  const particles: Particle[] = [];
  // 10x particle counts
  const count = style === 'stars' ? 400 : style === 'trails' ? 250 : 300;

  for (let i = 0; i < count; i++) {
    const t = i / count;

    // Initial random position
    const x = Math.random() * width;
    const y = Math.random() * height;

    // Velocity based on style
    let vx = 0, vy = 0;
    if (style === 'orbs') {
      vx = (Math.random() - 0.5) * 0.5;
      vy = -0.3 - Math.random() * 0.5; // Upward drift
    } else if (style === 'stars') {
      vx = (Math.random() - 0.5) * 0.3;
      vy = (Math.random() - 0.5) * 0.3;
    } else { // trails - upward flowing
      vx = (Math.random() - 0.5) * 0.4;
      vy = -0.8 - Math.random() * 0.6; // Upward flow
    }

    // Size based on style - adjusted for punchiness
    let baseSize: number;
    if (style === 'orbs') {
      baseSize = 40 + Math.random() * 60;
    } else if (style === 'stars') {
      baseSize = 10 + Math.random() * 20;
    } else { // trails - tall elongated shapes
      baseSize = 60 + Math.random() * 80;
    }

    // Color interpolation between cyan and pink
    const colorT = Math.random();
    const r = CYAN.r + (PINK.r - CYAN.r) * colorT;
    const g = CYAN.g + (PINK.g - CYAN.g) * colorT;
    const b = CYAN.b + (PINK.b - CYAN.b) * colorT;

    // Higher alpha values for punchier visuals
    const alpha = style === 'stars'
      ? 0.8 + Math.random() * 0.2
      : 0.7 + Math.random() * 0.3;

    particles.push({
      x, y, vx, vy,
      baseSize,
      size: baseSize,
      r, g, b,
      alpha,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1 + Math.random() * 3,
    });
  }

  // Add extra large faded background orbs for 'orbs' style
  if (style === 'orbs') {
    const largeOrbCount = 50;
    for (let i = 0; i < largeOrbCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const vx = (Math.random() - 0.5) * 0.2; // Slower movement
      const vy = -0.1 - Math.random() * 0.2;  // Gentle upward drift
      const baseSize = 300 + Math.random() * 400; // Massive: 300-700px

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
        alpha: 0.06 + Math.random() * 0.08, // Very dim: 0.06-0.14
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 1,
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
  };

  // Initial buffer upload
  uploadParticleData(ctx);

  // Start render loop
  startRenderLoop(ctx);

  // Handle resize
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  return ctx;
}

// Upload particle data to GPU buffers
function uploadParticleData(ctx: ShaderContext): void {
  const { gl, particles, buffers } = ctx;

  const positions = new Float32Array(particles.length * 2);
  const sizes = new Float32Array(particles.length);
  const colors = new Float32Array(particles.length * 4);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    positions[i * 2] = p.x;
    positions[i * 2 + 1] = p.y;
    sizes[i] = p.size;
    colors[i * 4] = p.r;
    colors[i * 4 + 1] = p.g;
    colors[i * 4 + 2] = p.b;
    colors[i * 4 + 3] = p.alpha;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.size);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizes);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
}

// Render loop - just draws, no calculations
function startRenderLoop(ctx: ShaderContext): void {
  const render = () => {
    const { gl, programs, currentStyle, uniforms, particles, vao, canvas, lastAudio, startTime } = ctx;

    const time = (performance.now() - startTime) / 1000;

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

    ctx.animationId = requestAnimationFrame(render);
  };

  render();
}

// Update particles - called at musical time intervals, not every frame
export function updateShader(ctx: ShaderContext, audio: AudioData): void {
  ctx.lastAudio = audio;
  ctx.isIdle = false;

  const { particles, canvas, currentStyle } = ctx;
  const time = audio.time;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Movement with simple sin/cos wobble (no expensive noise)
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

    // Size pulses with bass
    p.size = p.baseSize * (1.0 + audio.bass * 0.4);

    // Alpha based on intensity - higher base for punchier visuals
    const baseAlpha = 0.6 + audio.intensity * 0.4;

    // Twinkle for stars
    if (currentStyle === 'stars') {
      const twinkle = Math.sin(time * p.twinkleSpeed + p.phase) * 0.5 + 0.5;
      p.alpha = baseAlpha * (0.6 + twinkle * 0.4 + audio.treble * 0.2);
    } else {
      p.alpha = baseAlpha + audio.bass * 0.2; // Extra punch on bass hits
    }

    // Color shift with treble
    const colorShift = audio.treble * 0.3;
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
  updateShader(ctx, { intensity: 0.3, bass: 0.1, treble: 0.1, time: ctx.lastAudio.time });
}

// Change visual style
export function setShaderStyle(ctx: ShaderContext, style: string): void {
  if (ctx.currentStyle === style) return;

  const { gl, canvas, programs, buffers, vao } = ctx;

  // Recreate particles for new style
  ctx.particles = createParticles(style, canvas.width, canvas.height);
  ctx.currentStyle = style;

  // Reallocate buffers for new particle count
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
}
