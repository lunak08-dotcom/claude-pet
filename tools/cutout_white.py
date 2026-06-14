import sys
from collections import deque
import numpy as np
from PIL import Image

src = sys.argv[1]
out = sys.argv[2]
preview = sys.argv[3] if len(sys.argv) > 3 else None
FLOOD = int(sys.argv[4]) if len(sys.argv) > 4 else 240   # >= this min-channel = bg white
RAMP_LO = 210  # <= this -> fully opaque edge

im = Image.open(src).convert("RGB")
arr = np.asarray(im).astype(np.int16)
H, W, _ = arr.shape
mn = arr.min(axis=2)  # near 255 for white bg

white = mn >= FLOOD
vis = np.zeros((H, W), bool)
dq = deque()
for x in range(W):
    for y in (0, H - 1):
        if white[y, x] and not vis[y, x]:
            vis[y, x] = True; dq.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if white[y, x] and not vis[y, x]:
            vis[y, x] = True; dq.append((y, x))
while dq:
    y, x = dq.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and white[ny, nx] and not vis[ny, nx]:
            vis[ny, nx] = True; dq.append((ny, nx))

bg = vis
fg = ~bg

# largest fg component
lbl = np.zeros((H, W), np.int32); comp = 0; sizes = {}
for sy in range(H):
    for sx in range(W):
        if fg[sy, sx] and lbl[sy, sx] == 0:
            comp += 1; st = [(sy, sx)]; lbl[sy, sx] = comp; c = 0
            while st:
                yy, xx = st.pop(); c += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = yy + dy, xx + dx
                    if 0 <= ny < H and 0 <= nx < W and fg[ny, nx] and lbl[ny, nx] == 0:
                        lbl[ny, nx] = comp; st.append((ny, nx))
            sizes[comp] = c
main = max(sizes, key=sizes.get)
mask = lbl == main

# fill enclosed holes
hv = np.zeros((H, W), bool); nm = ~mask; dq = deque()
for x in range(W):
    for y in (0, H - 1):
        if nm[y, x] and not hv[y, x]: hv[y, x] = True; dq.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if nm[y, x] and not hv[y, x]: hv[y, x] = True; dq.append((y, x))
while dq:
    y, x = dq.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and nm[ny, nx] and not hv[ny, nx]:
            hv[ny, nx] = True; dq.append((ny, nx))
mask = mask | (~hv)

# soft edge: only on fg pixels near the bg (preserve white shirt interior)
bgd = bg.copy()
for _ in range(2):
    t = bgd.copy()
    t[1:, :] |= bgd[:-1, :]; t[:-1, :] |= bgd[1:, :]
    t[:, 1:] |= bgd[:, :-1]; t[:, :-1] |= bgd[:, 1:]
    bgd = t
edge = mask & bgd

soft = np.clip((FLOOD - mn) / float(FLOOD - RAMP_LO), 0, 1) * 255.0
alpha = np.where(mask, 255.0, 0.0)
alpha[edge] = np.minimum(alpha[edge], soft[edge])
alpha = alpha.astype(np.uint8)

rgb = arr.astype(np.uint8)
res = np.dstack([rgb, alpha])

ys, xs = np.where(mask); pad = 12
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, H)
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, W)
res = res[y0:y1, x0:x1]
Image.fromarray(res).save(out)

if preview:
    r = Image.fromarray(res)
    pw, ph = r.size
    chk = Image.new("RGBA", (pw, ph), (255, 255, 255, 255)); px = chk.load()
    for yy in range(ph):
        for xx in range(pw):
            if ((xx // 16) + (yy // 16)) % 2 == 0:
                px[xx, yy] = (200, 205, 205, 255)
    chk.alpha_composite(r)
    chk.convert("RGB").save(preview)

print("saved", out, r.size if preview else res.shape[1::-1])
