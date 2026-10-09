import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import {
  disposeModel,
  modelKind,
  prepareModel,
  registerModelSource,
  releaseModel,
  retainModel,
  setModelFade,
} from './model-resources';

function source() {
  const material = new MeshStandardMaterial({ opacity: 0.8 });
  const geometry = new BoxGeometry(2, 2, 2);
  const mesh = new Mesh(geometry, material);
  mesh.position.set(3, 0, 0);
  const root = new Group();
  root.add(mesh, new Mesh(geometry, material));
  return { root, mesh, material, geometry };
}

describe('modelKind', () => {
  it('reads the loader from the extension', () => {
    expect(modelKind('/models/pipe.glb')).toBe('gltf');
    expect(modelKind('/models/pipe.GLTF')).toBe('gltf');
    expect(modelKind('/a/b.fbx?v=2')).toBe('fbx');
    expect(modelKind('/a/b.obj#x')).toBe('obj');
  });

  it('rejects anything else', () => {
    expect(modelKind('/models/pipe.stl')).toBeNull();
    expect(modelKind('/models/pipe')).toBeNull();
  });
});

describe('prepareModel', () => {
  it('gives the copy its own materials and shares the geometry', () => {
    const { root, mesh, material, geometry } = source();
    const model = prepareModel(root);
    const copy = model.object.children[0] as Mesh;

    expect(copy).not.toBe(mesh);
    expect(copy.material).not.toBe(material);
    expect(copy.geometry).toBe(geometry);
    // Two meshes shared one material; the copies still share one.
    expect(model.materials.size).toBe(1);
    expect((model.object.children[1] as Mesh).material).toBe(copy.material);
  });

  it('measures the model and the offset that centres it', () => {
    const model = prepareModel(source().root);
    // Boxes of side 2 at x=0 and x=3: spans -1..4, centred on 1.5.
    expect(model.offset.x).toBeCloseTo(-1.5);
    expect(model.offset.y).toBeCloseTo(0);
    expect(model.radius).toBeGreaterThan(2.5);
  });

  it('fades the copy without touching the original', () => {
    const { root, material } = source();
    const model = prepareModel(root);
    const [own] = [...model.materials.keys()];

    setModelFade(model, 0);
    expect(own.opacity).toBe(0);
    expect(own.transparent).toBe(true);
    expect(material.opacity).toBe(0.8);
    expect(material.transparent).toBe(false);

    setModelFade(model, 1);
    expect(own.opacity).toBe(0.8);
    expect(own.transparent).toBe(false);
  });

  it('disposes only what the copy owns', () => {
    const { root, material, geometry } = source();
    const model = prepareModel(root);
    const [own] = [...model.materials.keys()];
    const disposed: string[] = [];
    own.addEventListener('dispose', () => disposed.push('own material'));
    material.addEventListener('dispose', () => disposed.push('material'));
    geometry.addEventListener('dispose', () => disposed.push('geometry'));

    disposeModel(model);
    expect(disposed).toEqual(['own material']);
  });
});

describe('releaseModel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('frees the file once its last viewer has gone', () => {
    const { root, geometry } = source();
    const onDispose = vi.fn();
    geometry.addEventListener('dispose', onDispose);
    const clear = vi.fn();

    retainModel('/a.glb');
    retainModel('/a.glb');
    registerModelSource('/a.glb', root);

    releaseModel('/a.glb', clear);
    vi.runAllTimers();
    expect(clear).not.toHaveBeenCalled();

    releaseModel('/a.glb', clear);
    vi.runAllTimers();
    expect(clear).toHaveBeenCalledExactlyOnceWith('/a.glb');
    expect(onDispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the file when a viewer remounts in the same tick', () => {
    const { root, geometry } = source();
    const onDispose = vi.fn();
    geometry.addEventListener('dispose', onDispose);
    const clear = vi.fn();

    retainModel('/b.glb');
    registerModelSource('/b.glb', root);
    releaseModel('/b.glb', clear);
    retainModel('/b.glb');
    vi.runAllTimers();

    expect(clear).not.toHaveBeenCalled();
    expect(onDispose).not.toHaveBeenCalled();
  });
});
