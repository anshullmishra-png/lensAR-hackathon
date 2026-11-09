"""
Author-time tool: turn the static MotiDog.glb into MotiRigged.glb, the same dog with a small skeleton.

Why: the generated dog is ONE fused mesh, so the tail, ears and jaw cannot move. Cutting it into pieces opens
seams. Skinning blends each vertex between neighbouring bones, so the parts bend with no gaps.

Skeleton (mesh space, +Z is the dog's nose, +Y up, the dog's left is -X):
  root -> head -> jaw, earL, earR
  root -> tail1 -> tail2 -> tail3

Run:  python tools/build_moti_rig.py [--debug-image out.png]
Needs numpy and Pillow. Output: Assets/GeneratedMeshes/MotiRigged.glb
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

SRC = Path("Assets/GeneratedMeshes/MotiDog.glb")
DST = Path("Assets/GeneratedMeshes/MotiRigged.glb")

# name, parent, pivot (mesh space)
JOINTS = [
    ("root", None, (0.0, 0.0, 0.0)),
    ("head", "root", (0.0, 0.22, 0.20)),
    ("jaw", "head", (0.0, 0.19, 0.30)),
    ("earL", "head", (-0.105, 0.34, 0.235)),
    ("earR", "head", (0.105, 0.34, 0.235)),
    ("tail1", "root", (0.03, -0.02, -0.37)),
    ("tail2", "tail1", (0.09, -0.07, -0.43)),
    ("tail3", "tail2", (0.15, -0.11, -0.47)),
]
IDX = {n: i for i, (n, _, _) in enumerate(JOINTS)}
TAIL_BASE = np.array([0.03, -0.02, -0.37])
TAIL_TIP = np.array([0.19, -0.12, -0.50])


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def read_glb(path):
    d = path.read_bytes()
    jl = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack("<I", d[off:off + 4])[0]
    return j, d[off + 8:off + 8 + bl]


def accessor(j, binb, i):
    a = j["accessors"][i]
    bv = j["bufferViews"][a["bufferView"]]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[a["type"]]
    ct = {5126: "<f4", 5123: "<u2", 5125: "<u4"}[a["componentType"]]
    o = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    x = np.frombuffer(binb, dtype=ct, count=a["count"] * n, offset=o)
    return x.reshape(-1, n) if n > 1 else x


def compute_weights(P):
    n = len(P)
    W = np.zeros((n, len(JOINTS)))
    x, y, z = P[:, 0], P[:, 1], P[:, 2]

    # Neck: the head bone takes over from the root between z 0.14 and 0.26, only high up (not chest or legs).
    w_head = smooth(0.14, 0.26, z) * smooth(0.06, 0.14, y)

    # Jaw: in front of the hinge and below the mouth line (the line drops toward the nose).
    mouth_y = 0.19 - 0.30 * (np.clip(z, 0.30, 0.40) - 0.30)
    w_jaw = smooth(0.31, 0.36, z) * (1 - smooth(mouth_y - 0.012, mouth_y + 0.012, y))

    # Ears: high on the head and out to the sides.
    w_ear = smooth(0.335, 0.40, y) * smooth(0.07, 0.10, np.abs(x)) * smooth(0.14, 0.2, z) * (1 - smooth(0.30, 0.34, z))
    w_ear = np.minimum(w_ear, 1 - w_jaw)

    # Tail: close to the line from base to tip, beyond the base.
    axis = TAIL_TIP - TAIL_BASE
    L2 = float(axis @ axis)
    t = ((P - TAIL_BASE) @ axis) / L2
    proj = TAIL_BASE + np.outer(t, axis)
    dist = np.linalg.norm(P - proj, axis=1)
    w_tail = (1 - smooth(0.05, 0.095, dist)) * smooth(-0.02, 0.18, t) * smooth(-0.33, -0.39, z)

    # Tail chain: split along t with overlapping ramps.
    k1 = 1 - smooth(0.15, 0.50, t)
    k3 = smooth(0.50, 0.85, t)
    k2 = np.clip(1 - k1 - k3, 0, 1)

    W[:, IDX["tail1"]] = w_tail * k1
    W[:, IDX["tail2"]] = w_tail * k2
    W[:, IDX["tail3"]] = w_tail * k3

    rest = 1 - w_tail
    head_total = w_head * rest
    W[:, IDX["jaw"]] = head_total * w_jaw
    side = x < 0
    W[:, IDX["earL"]] = np.where(side, head_total * w_ear, 0)
    W[:, IDX["earR"]] = np.where(~side, head_total * w_ear, 0)
    W[:, IDX["head"]] = head_total * (1 - w_jaw - w_ear)
    W[:, IDX["root"]] = rest * (1 - w_head)
    return W


def top4(W):
    n = len(W)
    J = np.zeros((n, 4), dtype=np.uint8)
    Wt = np.zeros((n, 4), dtype="<f4")
    order = np.argsort(-W, axis=1)[:, :4]
    for r in range(n):
        ws = W[r, order[r]]
        s = ws.sum()
        ws = ws / s if s > 0 else np.array([1, 0, 0, 0.0])
        J[r] = order[r]
        Wt[r] = ws
    return J, Wt


def soften_muzzle(png_bytes, P, UV, I):
    """
    The generated texture paints a large dark grey-brown plate on the muzzle below the nose. On the dog's face it reads as a
    dark smear. Lighten the dark texels of the lower muzzle toward a warm tan. The nose (higher up, near the tip) and the
    mouth line are left alone so the nose stays black and the mouth is still readable.
    """
    import io
    from PIL import Image, ImageDraw
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    W, H = im.size
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    tris = I.reshape(-1, 3).astype(int)
    for a, b2, c in tris:
        pts = P[[a, b2, c]]
        cen = pts.mean(0)
        # Lower muzzle: in front of the eyes, below the nose, above the chin.
        if cen[2] > 0.38 and 0.125 < cen[1] < 0.19 and abs(cen[0] - 0.05) < 0.1:
            poly = [(float(UV[i][0]) * W, float(UV[i][1]) * H) for i in (a, b2, c)]
            d.polygon(poly, fill=255)
    # Feather the edge a little so the lightened area has no hard outline.
    from PIL import ImageFilter
    mask = mask.filter(ImageFilter.GaussianBlur(2.0))
    arr = np.array(im).astype(float)
    m = np.array(mask).astype(float) / 255.0
    lum = arr[..., :3].mean(axis=2)
    dark = np.clip((135.0 - lum) / 70.0, 0, 1)
    alpha = (m * dark * 0.5)[..., None]
    tan = np.array([208.0, 158.0, 108.0])
    target = tan[None, None, :] * (0.78 + 0.4 * (lum / 255.0))[..., None]
    arr[..., :3] = arr[..., :3] * (1 - alpha) + target * alpha
    out = io.BytesIO()
    Image.fromarray(np.clip(arr, 0, 255).astype("uint8"), "RGBA").save(out, "PNG")
    return out.getvalue()


def pad4(b):
    return b + b"\x00" * ((4 - len(b) % 4) % 4)


def main():
    j, binb = read_glb(SRC)
    prim = j["meshes"][0]["primitives"][0]
    P = accessor(j, binb, prim["attributes"]["POSITION"]).astype("<f4")
    N = accessor(j, binb, prim["attributes"]["NORMAL"]).astype("<f4")
    UV = accessor(j, binb, prim["attributes"]["TEXCOORD_0"]).astype("<f4")
    I = accessor(j, binb, prim["indices"]).astype("<u2")
    Wf = compute_weights(P)
    J, Wt = top4(Wf)

    # Inverse bind matrices (column-major): translate by -pivot.
    ibm = np.zeros((len(JOINTS), 16), dtype="<f4")
    for i, (_, _, p) in enumerate(JOINTS):
        m = np.eye(4)
        m[0:3, 3] = -np.array(p)
        ibm[i] = m.T.reshape(16)

    images = []
    for im in j["images"]:
        bv = j["bufferViews"][im["bufferView"]]
        o = bv.get("byteOffset", 0)
        images.append(binb[o:o + bv["byteLength"]])

    # images[1] is the base colour (Image_0), images[0] the baked light map.
    images[1] = soften_muzzle(images[1], P, UV, I)

    chunks = []
    views = []

    def add(data, target=None):
        data = pad4(bytes(data))
        off = sum(len(c) for c in chunks)
        chunks.append(data)
        v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            v["target"] = target
        views.append(v)
        return len(views) - 1

    bv_pos = add(P.tobytes(), 34962)
    bv_nor = add(N.tobytes(), 34962)
    bv_uv = add(UV.tobytes(), 34962)
    bv_idx = add(I.tobytes(), 34963)
    bv_j = add(J.tobytes(), 34962)
    bv_w = add(Wt.tobytes(), 34962)
    bv_ibm = add(ibm.tobytes())
    bv_i0 = add(images[0])
    bv_i1 = add(images[1])
    # Fix byteLength of image views to the true PNG length (the padding is not part of the image).
    views[bv_i0]["byteLength"] = len(images[0])
    views[bv_i1]["byteLength"] = len(images[1])

    n = len(P)
    accessors = [
        {"bufferView": bv_pos, "componentType": 5126, "count": n, "type": "VEC3",
         "min": P.min(0).tolist(), "max": P.max(0).tolist()},
        {"bufferView": bv_nor, "componentType": 5126, "count": n, "type": "VEC3"},
        {"bufferView": bv_uv, "componentType": 5126, "count": n, "type": "VEC2"},
        {"bufferView": bv_idx, "componentType": 5123, "count": len(I), "type": "SCALAR"},
        {"bufferView": bv_j, "componentType": 5121, "count": n, "type": "VEC4"},
        {"bufferView": bv_w, "componentType": 5126, "count": n, "type": "VEC4"},
        {"bufferView": bv_ibm, "componentType": 5126, "count": len(JOINTS), "type": "MAT4"},
    ]

    # Nodes: 0 = skinned mesh, 1.. = joints.
    nodes = [{"mesh": 0, "skin": 0, "name": "MotiBody"}]
    pivots = {name: np.array(p) for name, _, p in JOINTS}
    for name, parent, p in JOINTS:
        t = (np.array(p) - (pivots[parent] if parent else 0)).tolist()
        nodes.append({"name": name, "translation": t, "children": []})
    for name, parent, _ in JOINTS:
        if parent:
            nodes[1 + IDX[parent]]["children"].append(1 + IDX[name])
    for nd in nodes[1:]:
        if not nd["children"]:
            del nd["children"]

    out = {
        "asset": {"version": "2.0", "generator": "tools/build_moti_rig.py"},
        "scene": 0,
        "scenes": [{"name": "Scene", "nodes": [0, 1]}],
        "nodes": nodes,
        "skins": [{"inverseBindMatrices": 6, "joints": [1 + i for i in range(len(JOINTS))], "skeleton": 1, "name": "MotiSkin"}],
        "meshes": [{"name": "geometry_0", "primitives": [{
            "attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2, "JOINTS_0": 4, "WEIGHTS_0": 5},
            "indices": 3, "material": 0}]}],
        "materials": j["materials"],
        "textures": j["textures"],
        "samplers": j["samplers"],
        "images": [{"bufferView": bv_i0, "mimeType": "image/png", "name": "lightmap"},
                   {"bufferView": bv_i1, "mimeType": "image/png", "name": "Image_0"}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": sum(len(c) for c in chunks)}],
    }
    jb = pad4(json.dumps(out, separators=(",", ":")).encode()).replace(b"\x00", b" ") if False else None
    js = json.dumps(out, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    body = b"".join(chunks)
    total = 12 + 8 + len(js) + 8 + len(body)
    DST.write_bytes(struct.pack("<4sII", b"glTF", 2, total) + struct.pack("<I4s", len(js), b"JSON") + js
                    + struct.pack("<I4s", len(body), b"BIN\x00") + body)
    print(f"wrote {DST} {DST.stat().st_size // 1024} KB, {len(I) // 3} triangles, {n} vertices, {len(JOINTS)} joints")

    if "--debug-image" in sys.argv:
        from PIL import Image, ImageDraw
        path = sys.argv[sys.argv.index("--debug-image") + 1]
        colors = np.array([(90, 90, 90), (60, 160, 255), (255, 60, 60), (60, 255, 80), (255, 255, 60),
                           (255, 140, 0), (255, 0, 255), (0, 255, 255)], dtype=float)
        vc = Wf @ colors
        views_ = [("side", 2, 1, 0), ("front", 0, 1, 2), ("top", 0, 2, 1)]
        Wd = 520
        im = Image.new("RGB", (Wd * 3, Wd), (20, 20, 20))
        d = ImageDraw.Draw(im)
        for k, (nm, ua, va, sort) in enumerate(views_):
            order = np.argsort(P[:, sort])
            for i in order:
                px = k * Wd + (P[i, ua] + 0.55) / 1.1 * Wd
                py = Wd - (P[i, va] + 0.55) / 1.1 * Wd
                d.ellipse([px - 3, py - 3, px + 3, py + 3], fill=tuple(int(c) for c in vc[i]))
            d.text((k * Wd + 5, 5), nm, fill=(255, 255, 255))
        im.save(path)
        print("debug image", path)


if __name__ == "__main__":
    main()
