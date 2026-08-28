#!/bin/zsh
cd ~/Documents/ouji-website
for b in Kwailnara NARD OOTD Lovisia MOEV plu numbuzin Nacific FRUDIA CORINGCO Farmstay; do
  python3 abw_crawl.py "$b"
done
