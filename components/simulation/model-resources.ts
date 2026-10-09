import {
  Box3,
  Sphere,
  Vector3,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Object3D,
  type Texture,
} from 'three';

export type ModelKind = 'gltf' | 'fbx' | 'obj';

/** Which loader a model file needs, from its extension; null if unsupported. */
export function modelKind(url: string): ModelKind | null {
  const path = url.split(/[?#]/)[0];
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'glb' || ext === 'gltf') return 'gltf';
  if (ext === 'fbx') return 'fbx';
  if (ext === 'obj') return 'obj';
  return null;
}

interface AuthoredOpacity {
  transparent: boolean;
  opacity: number;
}

export interface ViewerModel {
  object: Object3D;
  /** Radius of the model's bounding sphere, in its own units. */
  radius: number;
  /** Offset that puts the bounding sphere's centre on the origin. */
  offset: Vector3;
  /** This copy's own materials, with the opacity each was authored with. */
  materials: Map<Material, AuthoredOpacity>;
}

const isMesh = (o: Object3D): o is Mesh => (o as Mesh).isMesh === true;

/**
 * A copy of a loaded model for one viewer. The loader caches what it loaded
 * and hands the same object to every caller, so the copy gets materials of
 * its own: fading a viewer in would otherwise change the cached original and
 * every other copy with it. Geometry and textures stay shared with the
 * original.
 */
export function prepareModel(source: Object3D): ViewerModel {
  const object = source.clone();
  const owned = new Map<Material, Material>();
  const materials = new Map<Material, AuthoredOpacity>();
  const own = (shared: Material) => {
    let copy = owned.get(shared);
    if (!copy) {
      copy = shared.clone();
      owned.set(shared, copy);
      materials.set(copy, {
        transparent: copy.transparent,
        opacity: copy.opacity,
      });
    }
    return copy;
  };

  object.traverse((o) => {
    if (!isMesh(o)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.material = Array.isArray(o.material)
      ? o.material.map(own)
      : own(o.material);
  });

  object.updateWorldMatrix(true, true);
  const sphere = new Box3()
    .setFromObject(object)
    .getBoundingSphere(new Sphere());
  return {
    object,
    radius: sphere.radius,
    offset: sphere.center.clone().negate(),
    materials,
  };
}

/** Fades the copy: 0 is invisible, 1 is exactly as authored. */
export function setModelFade(model: ViewerModel, amount: number) {
  for (const [material, authored] of model.materials) {
    material.transparent = amount < 1 ? true : authored.transparent;
    material.opacity = authored.opacity * amount;
  }
}

/**
 * Frees what the copy owns. Geometry and textures are left alone: they belong
 * to the cached original, which other viewers may be drawing.
 */
export function disposeModel(model: ViewerModel) {
  for (const material of model.materials.keys()) material.dispose();
}

const isTexture = (value: unknown): value is Texture =>
  typeof value === 'object' &&
  value !== null &&
  (value as Texture).isTexture === true;

/** Frees everything a loaded original holds. Only safe once nothing draws it. */
export function disposeSource(source: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  source.traverse((o) => {
    if (!isMesh(o)) return;
    geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      materials.add(m);
      for (const value of Object.values(m)) {
        if (isTexture(value)) textures.add(value);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => {
    t.dispose();
    // glTF textures are ImageBitmaps, which hold their pixels until closed.
    const image: unknown = t.image;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
      image.close();
    }
  });
}

/*
 * How many mounted viewers show each file, and the original each file loaded.
 *
 * The loader cache keeps every model it has loaded for the life of the page
 * (the four models are 128 MB on disk), so the last viewer of a file releases
 * it. Two things make "last" less simple than an unmount:
 *  - Two viewers can show the same file; the count covers that.
 *  - React's development double-mount, and a viewer swapped for another of
 *    the same file, unmount and mount in the same tick. The release therefore
 *    waits a tick and is dropped if a viewer has appeared by then; otherwise
 *    the remounted viewer would be left drawing freed geometry and the next
 *    render would download the file again.
 */
const viewers = new Map<string, number>();
const sources = new Map<string, Object3D>();

export function registerModelSource(url: string, source: Object3D) {
  sources.set(url, source);
}

export function retainModel(url: string) {
  viewers.set(url, (viewers.get(url) ?? 0) + 1);
}

/**
 * @param clearCache drops the loader's cache entry, which is also what lets a
 *   file that failed to load be fetched again.
 */
export function releaseModel(url: string, clearCache: (url: string) => void) {
  const left = (viewers.get(url) ?? 1) - 1;
  if (left > 0) {
    viewers.set(url, left);
    return;
  }
  viewers.delete(url);
  setTimeout(() => {
    if (viewers.has(url)) return;
    const source = sources.get(url);
    sources.delete(url);
    if (source) disposeSource(source);
    clearCache(url);
  }, 0);
}
