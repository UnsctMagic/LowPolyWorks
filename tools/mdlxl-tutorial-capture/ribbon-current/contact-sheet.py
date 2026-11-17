# Contact sheet of one clip for review: python -I contact-sheet.py <mp4> <out.jpg> [seconds between frames]
import sys, subprocess, glob, os, shutil
from PIL import Image, ImageDraw
mp4, out = sys.argv[1], sys.argv[2]; step = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
tmp = out + '.d'; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
subprocess.run(['D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe', '-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', f'fps=1/{step},scale=632:380', tmp + '/%03d.bmp'], check=True)
fs = sorted(glob.glob(tmp + '/*.bmp')); cols = 4; rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (632 * cols, 380 * rows), 'white'); d = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    sh.paste(Image.open(f), ((i % cols) * 632, (i // cols) * 380)); d.text(((i % cols) * 632 + 6, (i // cols) * 380 + 6), f'{i*step:.0f}s', fill='red')
sh.save(out, quality=80); shutil.rmtree(tmp); print(out, len(fs))
