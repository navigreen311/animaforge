'use client';

/* ------------------------------------------------------------------ */
/*  WebGLRenderer - utility wrapper for WebGL2 2D drawing             */
/*  Provides drawRect, drawLine, drawText with OffscreenCanvas        */
/* ------------------------------------------------------------------ */

/** RGBA color as [r, g, b, a] with values 0-1 */
export type GLColor = [number, number, number, number];

/** Parse a CSS hex color (#rrggbb or #rgb) to GLColor */
export function hexToGL(hex: string, alpha = 1.0): GLColor {
  let r = 0, g = 0, b = 0;
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  } else if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) / 255;
    g = parseInt(hex[2] + hex[2], 16) / 255;
    b = parseInt(hex[3] + hex[3], 16) / 255;
  }
  return [r, g, b, alpha];
}

/* ------------------------------------------------------------------ */
/*  Shader sources                                                     */
/* ------------------------------------------------------------------ */

const VERT_SRC = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
in vec2 a_position;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform vec4 u_color;
out vec4 fragColor;
void main() {
  fragColor = u_color;
}
`;

/* ------------------------------------------------------------------ */
/*  Compile / link helpers                                             */
/* ------------------------------------------------------------------ */

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

/* ------------------------------------------------------------------ */
/*  Text texture cache                                                 */
/* ------------------------------------------------------------------ */

interface TextEntry {
  texture: WebGLTexture;
  width: number;
  height: number;
}

/* ------------------------------------------------------------------ */
/*  WebGLRenderer class                                                */
/* ------------------------------------------------------------------ */

export class WebGLRenderer {
  gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private aPosition: number;
  private uResolution: WebGLUniformLocation;
  private uColor: WebGLUniformLocation;
  private vao: WebGLVertexArrayObject;
  private posBuffer: WebGLBuffer;
  private textCanvas: OffscreenCanvas;
  private textCtx: OffscreenCanvasRenderingContext2D;
  private textCache: Map<string, TextEntry> = new Map();
  private textProgram: WebGLProgram;
  private textVao: WebGLVertexArrayObject;
  private textPosBuffer: WebGLBuffer;
  private textUvBuffer: WebGLBuffer;
  private textUResolution: WebGLUniformLocation;
  private textUSampler: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    const prog = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!prog) throw new Error('Failed to create WebGL program');
    this.program = prog;

    this.aPosition = gl.getAttribLocation(prog, 'a_position');
    this.uResolution = gl.getUniformLocation(prog, 'u_resolution')!;
    this.uColor = gl.getUniformLocation(prog, 'u_color')!;

    this.vao = gl.createVertexArray()!;
    this.posBuffer = gl.createBuffer()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    const textVertSrc = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_texcoord;
void main() {
  vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  v_texcoord = a_texcoord;
}
`;
    const textFragSrc = `#version 300 es
precision highp float;
uniform sampler2D u_sampler;
out vec4 fragColor;
in vec2 v_texcoord;
void main() {
  fragColor = texture(u_sampler, v_texcoord);
}
`;
    const textProg = createProgram(gl, textVertSrc, textFragSrc);
    if (!textProg) throw new Error('Failed to create text program');
    this.textProgram = textProg;

    const taPosLoc = gl.getAttribLocation(textProg, 'a_position');
    const taUvLoc = gl.getAttribLocation(textProg, 'a_texcoord');
    this.textUResolution = gl.getUniformLocation(textProg, 'u_resolution')!;
    this.textUSampler = gl.getUniformLocation(textProg, 'u_sampler')!;

    this.textVao = gl.createVertexArray()!;
    this.textPosBuffer = gl.createBuffer()!;
    this.textUvBuffer = gl.createBuffer()!;

    gl.bindVertexArray(this.textVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textPosBuffer);
    gl.enableVertexAttribArray(taPosLoc);
    gl.vertexAttribPointer(taPosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textUvBuffer);
    gl.enableVertexAttribArray(taUvLoc);
    gl.vertexAttribPointer(taUvLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.textCanvas = new OffscreenCanvas(512, 64);
    this.textCtx = this.textCanvas.getContext('2d')!;
  }

  setViewport(width: number, height: number) {
    this.gl.viewport(0, 0, width, height);
  }

  clear(color: GLColor = [0.035, 0.035, 0.043, 1.0]) {
    const gl = this.gl;
    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  drawRect(x: number, y: number, w: number, h: number, color: GLColor) {
    const gl = this.gl;
    const verts = new Float32Array([
      x, y,       x + w, y,       x, y + h,
      x, y + h,   x + w, y,       x + w, y + h,
    ]);
    gl.useProgram(this.program);
    gl.uniform2f(this.uResolution, gl.canvas.width, gl.canvas.height);
    gl.uniform4fv(this.uColor, color);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: GLColor, width = 1) {
    const gl = this.gl;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = (-dy / len) * (width / 2);
    const ny = (dx / len) * (width / 2);
    const verts = new Float32Array([
      x1 + nx, y1 + ny,   x1 - nx, y1 - ny,   x2 + nx, y2 + ny,
      x2 + nx, y2 + ny,   x1 - nx, y1 - ny,   x2 - nx, y2 - ny,
    ]);
    gl.useProgram(this.program);
    gl.uniform2f(this.uResolution, gl.canvas.width, gl.canvas.height);
    gl.uniform4fv(this.uColor, color);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  drawLineStrip(points: Float32Array, color: GLColor, width = 1.5) {
    for (let i = 0; i < points.length - 2; i += 2) {
      this.drawLine(points[i], points[i + 1], points[i + 2], points[i + 3], color, width);
    }
  }

  drawText(
    text: string,
    x: number,
    y: number,
    color: GLColor,
    size = 11,
    align: 'left' | 'right' | 'center' = 'left',
    bold = false,
  ) {
    const gl = this.gl;
    const cacheKey = `${text}|${size}|${bold}|${color.join(',')}`;
    let entry = this.textCache.get(cacheKey);

    if (!entry) {
      const fontStr = `${bold ? 'bold ' : ''}${size}px system-ui, -apple-system, sans-serif`;
      this.textCtx.font = fontStr;
      const metrics = this.textCtx.measureText(text);
      const tw = Math.ceil(metrics.width) + 4;
      const th = Math.ceil(size * 1.5) + 4;

      if (this.textCanvas.width < tw || this.textCanvas.height < th) {
        this.textCanvas.width = Math.max(this.textCanvas.width, tw);
        this.textCanvas.height = Math.max(this.textCanvas.height, th);
      }

      this.textCtx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
      this.textCtx.font = fontStr;
      this.textCtx.fillStyle = `rgba(${Math.round(color[0] * 255)},${Math.round(color[1] * 255)},${Math.round(color[2] * 255)},${color[3]})`;
      this.textCtx.textBaseline = 'top';
      this.textCtx.textAlign = 'left';
      this.textCtx.fillText(text, 2, 2);

      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textCanvas);

      entry = { texture, width: tw, height: th };
      this.textCache.set(cacheKey, entry);

      if (this.textCache.size > 200) {
        const firstKey = this.textCache.keys().next().value;
        if (firstKey !== undefined) {
          const old = this.textCache.get(firstKey);
          if (old) gl.deleteTexture(old.texture);
          this.textCache.delete(firstKey);
        }
      }
    }

    let drawX = x;
    if (align === 'right') drawX = x - entry.width;
    else if (align === 'center') drawX = x - entry.width / 2;

    const drawY = y;
    const w = entry.width;
    const h = entry.height;

    const posVerts = new Float32Array([
      drawX, drawY,       drawX + w, drawY,       drawX, drawY + h,
      drawX, drawY + h,   drawX + w, drawY,       drawX + w, drawY + h,
    ]);
    const uvVerts = new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1,
    ]);

    gl.useProgram(this.textProgram);
    gl.uniform2f(this.textUResolution, gl.canvas.width, gl.canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, entry.texture);
    gl.uniform1i(this.textUSampler, 0);

    gl.bindVertexArray(this.textVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, posVerts, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textUvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvVerts, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  drawRectOutline(x: number, y: number, w: number, h: number, color: GLColor, lineWidth = 1) {
    this.drawLine(x, y, x + w, y, color, lineWidth);
    this.drawLine(x + w, y, x + w, y + h, color, lineWidth);
    this.drawLine(x, y + h, x + w, y + h, color, lineWidth);
    this.drawLine(x, y, x, y + h, color, lineWidth);
  }

  clearTextCache() {
    const gl = this.gl;
    this.textCache.forEach((entry) => gl.deleteTexture(entry.texture));
    this.textCache.clear();
  }

  dispose() {
    const gl = this.gl;
    this.clearTextCache();
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.textProgram);
    gl.deleteBuffer(this.posBuffer);
    gl.deleteBuffer(this.textPosBuffer);
    gl.deleteBuffer(this.textUvBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.textVao);
  }
}
