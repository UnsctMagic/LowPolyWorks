# Contact sheet of one clip for review: python -I contact-sheet.py <mp4> <out.jpg> [seconds between frames] [columns] [thumbnail width]
import sys, subprocess, glob, os, shutil
from PIL import Image, ImageDraw
mp4, out = sys.argv[1], sys.argv[2]; step = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4; tw = int(sys.argv[5]) if len(sys.argv) > 5 else 632; th = round(tw * 760 / 1264)
tmp = out + '.d'; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
subprocess.run(['D:/Claude/MDLxL/electron/ffmpeg/ffmpeg.exe', '-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', f'fps=1/{step},scale={tw}:{th}', tmp + '/%03d.bmp'], check=True)
fs = sorted(glob.glob(tmp + '/*.bmp')); rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (tw * cols, th * rows), 'white'); d = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    sh.paste(Image.open(f), ((i % cols) * tw, (i // cols) * th)); d.text(((i % cols) * tw + 6, (i // cols) * th + 6), f'{i*step:.1f}s', fill='red')
sh.save(out, quality=82); shutil.rmtree(tmp); print(out, len(fs))
