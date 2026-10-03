#!/usr/bin/env python3
"""Measure minimum text contrast against *every* pixel in an image box.
Box coordinates are source-image pixels: x y width height. Requires Pillow.
"""
import argparse
from PIL import Image

def lum(rgb):
    return sum(k*(x/255/12.92 if x/255<=.04045 else ((x/255+.055)/1.055)**2.4)
               for k,x in zip((.2126,.7152,.0722),rgb))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('image');p.add_argument('x',type=int);p.add_argument('y',type=int)
    p.add_argument('width',type=int);p.add_argument('height',type=int)
    p.add_argument('--text',default='#1e3038');p.add_argument('--minimum',type=float,default=4.5)
    p.add_argument('--plate',help='CSS plate hex, composited over image pixels')
    p.add_argument('--opacity',type=float,default=1.0,help='plate alpha from 0 to 1')
    args=p.parse_args()
    with Image.open(args.image) as im:
        im=im.convert('RGB')
        box=(args.x,args.y,args.x+args.width,args.y+args.height)
        if args.width<=0 or args.height<=0 or args.x<0 or args.y<0 or box[2]>im.width or box[3]>im.height:p.error('box outside image')
        if not 0<=args.opacity<=1:p.error('opacity must be 0..1')
        plate=tuple(bytes.fromhex(args.plate.lstrip('#'))) if args.plate else None
        text=lum(tuple(bytes.fromhex(args.text.lstrip('#'))));worst=(float('inf'),None,None)
        for j in range(box[1],box[3]):
            for i in range(box[0],box[2]):
                pixel=im.getpixel((i,j))
                if plate:pixel=tuple(round(args.opacity*p+(1-args.opacity)*b) for p,b in zip(plate,pixel))
                bg=lum(pixel);ratio=(max(text,bg)+.05)/(min(text,bg)+.05)
                if ratio<worst[0]:worst=(ratio,i,j)
        print(f'{args.image}: minimum {worst[0]:.3f}:1 at ({worst[1]}, {worst[2]}) (required {args.minimum}:1)')
        return 0 if worst[0]>=args.minimum else 1
if __name__=='__main__':raise SystemExit(main())
