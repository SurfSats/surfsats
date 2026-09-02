import {
  mat3NormalFromMat4,
  mat4,
  mat4Invert,
  mat4LookAt,
  mat4Mul,
  mat4Perspective,
  vec3,
  type Mat4,
  type Vec3,
} from "./math";
import { createBox, createPanel, type Geometry } from "./models";
import { FIRE_POS } from "./presets";
import { PALETTE } from "./room";
import { walk, type ShackNode } from "./scene";

const VERT = `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aColor;
layout(location = 3) in vec2 aUv;

uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform mat3 uN;
uniform vec2 uUvOff;
uniform vec2 uUvScl;

out vec3 vWorldPos;
out vec3 vNormal;
out vec3 vColor;
out vec2 vUv;

void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vWorldPos = world.xyz;
  vNormal = uN * aNormal;
  vColor = aColor;
  vUv = uUvOff + aUv * uUvScl;
  gl_Position = uProj * uView * world;
}
`;

const FRAG = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec3 vColor;
in vec2 vUv;

uniform vec3 uColor;
uniform vec3 uEmissive;
uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform vec3 uAmbient;
uniform vec3 uCamPos;
uniform float uHighlight;
uniform sampler2D uTex;
uniform float uUseTex;
uniform float uTime;
uniform float uSpark;

out vec4 fragColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = uLightPos - vWorldPos;
  float dist = length(L);
  L /= max(dist, 1e-4);
  float atten = uLightIntensity / (1.0 + 0.09 * dist * dist);
  float ndotl = max(dot(N, L), 0.0);
  vec3 albedo = vColor * uColor;
  if (uUseTex > 0.5) {
    albedo *= texture(uTex, vUv).rgb;
  }
  float flicker = 1.0;
  if (uSpark > 0.5) {
    float hash = fract(sin(floor(uTime * 18.0) * 12.9898) * 43758.5453);
    flicker = 0.78 + 0.22 * step(0.12, hash);
    flicker *= 0.9 + 0.1 * sin(vUv.y * 72.0 + uTime * 7.0);
  }
  albedo *= flicker;
  vec3 ambient = uAmbient * (0.55 + 0.45 * max(N.y, 0.0));
  vec3 lit = albedo * (ambient + uLightColor * ndotl * atten);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 hi = vec3(1.0, 0.55, 0.12) * uHighlight * (0.55 + 0.9 * rim);
  vec3 em = uEmissive * (1.0 + uHighlight * 1.15) * flicker;
  vec3 c = lit + em + hi;
  c = c / (vec3(1.0) + c * 0.28);
  fragColor = vec4(c, 1.0);
}
`;

type GpuMesh = {
  vao: WebGLVertexArrayObject;
  count: number;
};

type Program = {
  id: WebGLProgram;
  uProj: WebGLUniformLocation;
  uView: WebGLUniformLocation;
  uModel: WebGLUniformLocation;
  uN: WebGLUniformLocation;
  uColor: WebGLUniformLocation;
  uEmissive: WebGLUniformLocation;
  uLightPos: WebGLUniformLocation;
  uLightColor: WebGLUniformLocation;
  uLightIntensity: WebGLUniformLocation;
  uAmbient: WebGLUniformLocation;
  uCamPos: WebGLUniformLocation;
  uHighlight: WebGLUniformLocation;
  uTex: WebGLUniformLocation;
  uUseTex: WebGLUniformLocation;
  uUvOff: WebGLUniformLocation;
  uUvScl: WebGLUniformLocation;
  uTime: WebGLUniformLocation;
  uSpark: WebGLUniformLocation;
};

export type ShackRenderer = {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  ok: boolean;
  aa: boolean;
  resize: () => void;
  draw: (root: ShackNode, view: Mat4, proj: Mat4, eye: Vec3, time: number) => void;
  viewProjInv: () => Mat4;
  dispose: () => void;
};

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader alloc");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "compile";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string): Program {
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  const id = gl.createProgram();
  if (!id) throw new Error("program alloc");
  gl.attachShader(id, vs);
  gl.attachShader(id, fs);
  gl.linkProgram(id);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(id, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(id) ?? "link";
    gl.deleteProgram(id);
    throw new Error(log);
  }
  const uni = (name: string) => {
    const loc = gl.getUniformLocation(id, name);
    if (!loc) throw new Error(name);
    return loc;
  };
  return {
    id,
    uProj: uni("uProj"),
    uView: uni("uView"),
    uModel: uni("uModel"),
    uN: uni("uN"),
    uColor: uni("uColor"),
    uEmissive: uni("uEmissive"),
    uLightPos: uni("uLightPos"),
    uLightColor: uni("uLightColor"),
    uLightIntensity: uni("uLightIntensity"),
    uAmbient: uni("uAmbient"),
    uCamPos: uni("uCamPos"),
    uHighlight: uni("uHighlight"),
    uTex: uni("uTex"),
    uUseTex: uni("uUseTex"),
    uUvOff: uni("uUvOff"),
    uUvScl: uni("uUvScl"),
    uTime: uni("uTime"),
    uSpark: uni("uSpark"),
  };
}

function upload(gl: WebGL2RenderingContext, geom: Geometry): GpuMesh {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("vao");
  gl.bindVertexArray(vao);

  const pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(gl.ARRAY_BUFFER, geom.positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const nrm = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nrm);
  gl.bufferData(gl.ARRAY_BUFFER, geom.normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  const col = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, col);
  gl.bufferData(gl.ARRAY_BUFFER, geom.colors, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

  const uv = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uv);
  gl.bufferData(gl.ARRAY_BUFFER, geom.uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, 0);

  const idx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geom.indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  return { vao, count: geom.indices.length };
}

const UP = vec3(0, 1, 0);
const LIGHT_COLOR = vec3(1.0, 0.55, 0.18);
const AMBIENT = vec3(0.055, 0.048, 0.042);

export function createRenderer(
  canvas: HTMLCanvasElement,
  floorGeom: Geometry,
): ShackRenderer | null {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: true,
    powerPreference: "high-performance",
  });
  if (!gl) return null;

  let program: Program;
  let box: GpuMesh;
  let panel: GpuMesh;
  let floor: GpuMesh;
  try {
    program = link(gl, VERT, FRAG);
    box = upload(gl, createBox());
    panel = upload(gl, createPanel());
    floor = upload(gl, floorGeom);
  } catch {
    return null;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(PALETTE.night.x, PALETTE.night.y, PALETTE.night.z, 1);

  const view = mat4();
  const proj = mat4();
  const viewProj = mat4();
  const inv = mat4();
  const normal = new Float32Array(9);
  const lightPos = vec3(FIRE_POS.x, 0.85, FIRE_POS.z);
  const texCache = new Map<string, WebGLTexture | null>();
  const texPending = new Set<string>();
  const white = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, white);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255, 255, 255, 255]),
  );

  const loadTex = (url: string) => {
    if (texCache.has(url) || texPending.has(url)) return;
    texPending.add(url);
    const img = new Image();
    img.onload = () => {
      const t = gl.createTexture();
      if (!t) {
        texCache.set(url, null);
        return;
      }
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      texCache.set(url, t);
    };
    img.onerror = () => {
      texCache.set(url, null);
    };
    img.src = url;
  };

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const draw = (root: ShackNode, v: Mat4, p: Mat4, eye: Vec3, time: number) => {
    view.set(v);
    proj.set(p);
    mat4Mul(proj, view, viewProj);
    mat4Invert(viewProj, inv);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program.id);
    gl.uniformMatrix4fv(program.uProj, false, proj);
    gl.uniformMatrix4fv(program.uView, false, view);
    gl.uniform3f(program.uLightPos, lightPos.x, lightPos.y, lightPos.z);
    gl.uniform3f(program.uLightColor, LIGHT_COLOR.x, LIGHT_COLOR.y, LIGHT_COLOR.z);
    gl.uniform1f(program.uLightIntensity, 16);
    gl.uniform3f(program.uAmbient, AMBIENT.x, AMBIENT.y, AMBIENT.z);
    gl.uniform3f(program.uCamPos, eye.x, eye.y, eye.z);
    gl.uniform1i(program.uTex, 0);
    gl.uniform1f(program.uTime, time);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, white);

    walk(root, (node) => {
      const mesh = node.mesh;
      if (!mesh) return;
      const gpu =
        mesh.kind === "floor" ? floor : mesh.kind === "panel" ? panel : box;
      mat3NormalFromMat4(node.world, normal);
      gl.uniformMatrix4fv(program.uModel, false, node.world);
      gl.uniformMatrix3fv(program.uN, false, normal);
      gl.uniform3f(program.uColor, mesh.color.x, mesh.color.y, mesh.color.z);
      gl.uniform3f(
        program.uEmissive,
        mesh.emissive.x,
        mesh.emissive.y,
        mesh.emissive.z,
      );
      gl.uniform1f(program.uHighlight, node.highlight ? 1 : 0);
      gl.uniform2f(
        program.uUvOff,
        mesh.uvOff ? mesh.uvOff[0] : 0,
        mesh.uvOff ? mesh.uvOff[1] : 0,
      );
      gl.uniform2f(
        program.uUvScl,
        mesh.uvScl ? mesh.uvScl[0] : 1,
        mesh.uvScl ? mesh.uvScl[1] : 1,
      );
      gl.uniform1f(program.uSpark, mesh.spark === "crt" ? 1 : 0);
      let useTex = 0;
      if (mesh.tex) {
        loadTex(mesh.tex);
        const gpuTex = texCache.get(mesh.tex);
        if (gpuTex) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, gpuTex);
          useTex = 1;
        }
      }
      gl.uniform1f(program.uUseTex, useTex);
      gl.bindVertexArray(gpu.vao);
      gl.drawElements(gl.TRIANGLES, gpu.count, gl.UNSIGNED_SHORT, 0);
    });
    gl.bindVertexArray(null);
  };

  const attrs = gl.getContextAttributes();

  return {
    gl,
    canvas,
    ok: true,
    aa: !!attrs?.antialias,
    resize,
    draw,
    viewProjInv: () => inv,
    dispose: () => {
      for (const t of texCache.values()) {
        if (t) gl.deleteTexture(t);
      }
      texCache.clear();
      if (white) gl.deleteTexture(white);
      gl.deleteProgram(program.id);
    },
  };
}

export function makeView(eye: Vec3, target: Vec3, out: Mat4): Mat4 {
  return mat4LookAt(eye, target, UP, out);
}

export function makeProj(
  aspect: number,
  out: Mat4,
  fovy = (58 * Math.PI) / 180,
): Mat4 {
  return mat4Perspective(fovy, aspect, 0.12, 48, out);
}
