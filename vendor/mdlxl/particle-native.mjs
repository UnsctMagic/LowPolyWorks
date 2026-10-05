// ../../2026-10-04/pack/work/MDLxL-release-0.18.6/app/particle-preview-adapter.js
import { Matrix4 as Matrix42, Vector3 as Vector32, Vector2, Raycaster, Triangle } from "three";

// ../../2026-10-04/pack/work/MDLxL-release-0.18.6/src/animation.js
import { Matrix3, Matrix4, Quaternion, Vector3 } from "three";
function sampleTrack(track, frame, options = {}) {
  const { interval, globalSequences = [], globalTime = frame, fallback = 0, quaternion = false } = options;
  if (track == null) return fallback;
  if (typeof track === "number" || Array.isArray(track) || ArrayBuffer.isView(track)) return track;
  let from = interval?.[0] ?? -Infinity, to = interval?.[1] ?? Infinity;
  const globalId = track.GlobalSeqId;
  if (Number.isInteger(globalId) && globalId >= 0 && globalSequences[globalId] > 0) {
    to = globalSequences[globalId];
    from = 0;
    frame = (globalTime % to + to) % to;
  }
  const keys = track.Keys || [];
  let first = 0, last = keys.length - 1;
  while (first <= last && keys[first].Frame < from) first++;
  while (last >= first && keys[last].Frame > to) last--;
  if (first > last) return fallback;
  let left = keys[first], right = left;
  if (frame >= keys[last].Frame) left = right = keys[last];
  else if (frame > left.Frame) {
    let lo = first, hi = last;
    while (lo + 1 < hi) {
      const mid = lo + hi >> 1;
      if (keys[mid].Frame <= frame) lo = mid;
      else hi = mid;
    }
    left = keys[lo];
    right = keys[hi];
  }
  const a = left.Vector, b = right.Vector;
  const scalar = typeof fallback === "number";
  if (left === right || track.LineType === 0) return scalar ? a[0] : Array.from(a);
  const t = Math.max(0, Math.min(1, (frame - left.Frame) / (right.Frame - left.Frame)));
  if (quaternion) {
    const qa = new Quaternion().fromArray(a).normalize(), qb = new Quaternion().fromArray(b).normalize();
    if ((track.LineType === 2 || track.LineType === 3) && left.OutTan && right.InTan) {
      const outer = qa.clone().slerp(qb, t);
      const inner = new Quaternion().fromArray(left.OutTan).normalize().slerp(new Quaternion().fromArray(right.InTan).normalize(), t);
      return outer.slerp(inner, 2 * t * (1 - t)).normalize().toArray();
    }
    return qa.slerp(qb, t).normalize().toArray();
  }
  const result = Array.from(a, (v, i) => {
    if ((track.LineType === 2 || track.LineType === 3) && left.OutTan && right.InTan) {
      const out = left.OutTan[i], incoming = right.InTan[i];
      if (track.LineType === 3) return (1 - t) ** 3 * v + 3 * t * (1 - t) ** 2 * out + 3 * t * t * (1 - t) * incoming + t ** 3 * b[i];
      return (2 * t ** 3 - 3 * t * t + 1) * v + (t ** 3 - 2 * t * t + t) * out + (t ** 3 - t * t) * incoming + (-2 * t ** 3 + 3 * t * t) * b[i];
    }
    return v + (b[i] - v) * t;
  });
  return scalar ? result[0] : result;
}

// ../../2026-10-04/pack/work/MDLxL-release-0.18.6/app/particle-preview-adapter.js
var compatibleParticleRuntimes = /* @__PURE__ */ new WeakSet();
function particleAtlasFrame(range, progress, columns, rows) {
  const [first = 0, end = 0, repeat = 1] = range || [], count = end - first;
  const offset = count > 0 ? (Math.floor(count * repeat * (Number.isFinite(progress) ? progress : 0)) % count + count) % count : 0;
  return Math.min(Math.max(0, columns * rows - 1), first + offset);
}
function installParticleNativeCompatibility(native) {
  if (compatibleParticleRuntimes.has(native)) return;
  compatibleParticleRuntimes.add(native);
  const particles = native.particlesController, create = particles.createParticle, buffers = particles.updateParticleBuffers;
  const identity = new Matrix42().elements, point = new Vector32(), velocity = new Vector32(), origin = new Vector32(), matrix = new Matrix42(), positionValues = new Float32Array(3), velocityValues = new Float32Array(3);
  particles.createParticle = function(emitter, transform) {
    return create.call(this, emitter, emitter.props.Flags & 524288 ? identity : transform);
  };
  particles.updateParticleBuffers = function(particle, index, emitter) {
    if (!(emitter.props.Flags & 524288)) return buffers.call(this, particle, index, emitter);
    const position = particle.pos, speed = particle.speed;
    matrix.fromArray(native.rendererData.nodes[emitter.props.ObjectId].matrix);
    point.fromArray(position).applyMatrix4(matrix);
    origin.set(0, 0, 0).applyMatrix4(matrix);
    velocity.fromArray(speed).applyMatrix4(matrix).sub(origin);
    positionValues.set(point.toArray());
    velocityValues.set(velocity.toArray());
    particle.pos = positionValues;
    particle.speed = velocityValues;
    try {
      return buffers.call(this, particle, index, emitter);
    } finally {
      particle.pos = position;
      particle.speed = speed;
    }
  };
  particles.updateParticleTexCoordsByType = function(index, emitter, early, progress, type) {
    const props = emitter.props, columns = props.Columns, rows = props.Rows, range = type === 2 ? early ? props.TailUVAnim : props.TailDecayUVAnim : early ? props.LifeSpanUVAnim : props.DecayUVAnim;
    const target = type === 2 ? emitter.tailTexCoords : emitter.headTexCoords;
    if (!target || !(columns > 0 && rows > 0)) return;
    const cell = particleAtlasFrame(range, progress, columns, rows), x = cell % columns, y = Math.floor(cell / columns);
    target.set([x / columns, y / rows, x / columns, (y + 1) / rows, (x + 1) / columns, y / rows, (x + 1) / columns, (y + 1) / rows], index * 8);
  };
  const layer = particles.setLayerProps;
  particles.setLayerProps = function(emitter) {
    const id = emitter.props.TextureID, replacement = emitter.props.ReplaceableId, original = this.rendererData.model.Textures[id];
    if (replacement === 1 || replacement === 2) this.rendererData.model.Textures[id] = { Image: "", ReplaceableId: replacement, Flags: original?.Flags || 0 };
    try {
      return layer.call(this, emitter);
    } finally {
      if (replacement === 1 || replacement === 2) this.rendererData.model.Textures[id] = original;
    }
  };
  const ribbons = native.ribbonsController, uv = ribbons.updateEmitterTexCoords, resizeRibbon = ribbons.resizeEmitterBuffers, renderRibbons = ribbons.render;
  ribbons.resizeEmitterBuffers = function(emitter, size) {
    emitter.baseCapacity = Math.max(emitter.baseCapacity, size);
    return resizeRibbon.call(this, emitter, size);
  };
  ribbons.render = function(...args) {
    const saved = [];
    for (const emitter of this.emitters) if (emitter.props.Color?.Keys) {
      const track = emitter.props.Color;
      saved.push([emitter.props, track]);
      emitter.props.Color = sampleTrack(track, native.getFrame(), { interval: native.model.Sequences[native.getSequence()]?.Interval, globalSequences: native.model.GlobalSequences, globalTime: native.rendererData.globalSequencesFrames[track.GlobalSeqId] ?? native.getFrame(), fallback: [1, 1, 1] });
    }
    try {
      return renderRibbons.apply(this, args);
    } finally {
      for (const [props, color] of saved) props.Color = color;
    }
  };
  ribbons.updateEmitterTexCoords = function(emitter, now) {
    uv.call(this, emitter, now);
    const rows = emitter.props.Rows, columns = emitter.props.Columns;
    if (!(rows > 0 && columns > 0)) return;
    const cell = this.interp.animVectorVal(emitter.props.TextureSlot, 0), y = Math.floor(cell / columns) / rows;
    for (let i = 0; i < emitter.creationTimes.length; i++) {
      emitter.texCoords[i * 4 + 1] = y;
      emitter.texCoords[i * 4 + 3] = y + 1 / rows;
    }
  };
}
export {
  installParticleNativeCompatibility,
  particleAtlasFrame
};
