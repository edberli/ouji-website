#!/usr/bin/env python3
"""
Mirror Olive Young product imagery into brands/<brand>/.

Olive Young's CDN serves fine to a normal client, so the whole thing is
scriptable — no browser, no manual downloads. The long "detail" strips
are the sliced marketing image shown under Product Info; they stack
vertically to form one Taobao-style page.

    python3 scripts/fetch_oy_assets.py glint

Add a brand by dropping its URLs into ASSETS below. Gallery URLs are
under /prdtImg/, detail strips under /slicedImg/editor/.
"""
import os
import sys
import urllib.request

CDN = "https://cdn-image.oliveyoung.com/"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# slug -> {"gallery": [paths], "detail": [paths]}  (paths are CDN-relative)
ASSETS = {
    "glint": {
        "glint-highlighter": {
            "gallery": [
                "prdtImg/1112/ba4a8279-5e16-45e6-9e50-87d370171194.jpg",
                "prdtImg/1141/395fc426-d9c7-491f-a224-d4dba73d6c5e.jpg",
                "prdtImg/1931/c6b5349b-cc40-4b59-a67a-8cca54804554.jpg",
                "prdtImg/1980/70535c44-7cd3-4997-8e7b-3854af7df0e6.png",
                "prdtImg/1389/623257e7-8a06-44f6-bfea-4ffdede8a5ff.jpg",
                "prdtImg/1277/09bf1537-6222-4396-8d4e-a17f2970fb9e.jpg",
            ],
            "detail": [
                "slicedImg/editor/1072/318f759b-594b-4aa9-8210-8ca545cb17fd"
                + s + ".jpg"
                for s in [
                    "f88d341d-b8bf-41c6-a094-deb0cb5f766b",
                    "a0c69023-2b59-4a5e-a1fb-c2ce056f3697",
                    "c8736e4d-9e4f-4e91-8a3c-98dbdfba04c8",
                    "f6477eb6-41f1-4d92-bc74-50a509c09b95",
                    "c354b8cf-e770-436e-a57f-7759bbc578e9",
                    "629ae9c2-5246-41ba-a885-55433dc8d0b3",
                    "33ac4b5c-2dbc-470a-9551-a524d2a4d728",
                    "0ebe9b62-b4b5-4fe4-90a7-53711e1dc9b5",
                    "269a78b8-f524-47dd-861b-f9f08470c16a",
                ]
            ],
        },
        "glint-stick-highlighter": {
            "gallery": [
                "prdtImg/1773/f01b2b0d-d25c-4ca6-a278-4b8fea6ffb36.jpg",
                "prdtImg/1202/f4e4aa11-43c6-4a23-b902-d9135fe5e302.jpg",
                "prdtImg/1732/1a17e0b3-a47d-4504-a7f2-ff5c06f6cb2c.jpg",
                "prdtImg/1161/7d3b9384-6ccd-4c51-9cdf-dd5248df5483.jpg",
            ],
            "detail": [
                "slicedImg/editor/1754/7e111e24-3a59-476e-85db-ad515a40d467"
                + s + ".jpg"
                for s in [
                    "7e058359-d2fa-4e4b-84a0-18857097ab86",
                    "678f734b-fa3e-4c0d-86fd-b414bd8c2fc4",
                ]
            ],
        },
        "glint-baked-blush": {
            "gallery": [
                "prdtImg/1188/9e9baafd-3e07-4162-8815-22618b677268.png",
                "prdtImg/1056/9c069ec0-b2e4-46a7-9cc9-5e2b2126c535.jpg",
                "prdtImg/1083/22cc7374-3b5e-46da-bf5f-dc493a75108b.jpg",
                "prdtImg/1402/8cc975f1-7176-48ec-a688-91ec54d17e78.jpg",
                "prdtImg/1279/c825ac7f-7c56-4aff-b2f0-e4ed18db2afc.jpg",
                "prdtImg/1960/0c865eec-8ac3-42b3-87d2-927dfdaaa34c.jpg",
                "prdtImg/1001/e8319452-9cf5-4d51-bb47-fbda9cb75012.jpg",
                "prdtImg/1320/08a0e92f-3932-42ab-a7b4-8930506f3ac6.jpg",
            ],
            "detail": [
                "slicedImg/editor/1350/3341cbee-6785-4f90-bb87-ec0c07558f90685c8447-3f3d-48a9-9e7b-aa18cf418b77.png",
                "slicedImg/editor/1350/3341cbee-6785-4f90-bb87-ec0c07558f9068c0c3c1-01f9-4082-9f69-eac83572de89.png",
                "slicedImg/editor/1871/f002b1db-693b-4aa8-b10b-f53f03ae9026d1db55bd-f8dc-4b3c-a8c6-f77fd32c0921.png",
                "slicedImg/editor/1871/f002b1db-693b-4aa8-b10b-f53f03ae9026a2aa0a0b-4977-4114-94a0-37123e188075.png",
                "slicedImg/editor/1871/f002b1db-693b-4aa8-b10b-f53f03ae902640c268df-92cf-4b99-93e1-0cc6cb02a963.png",
                "slicedImg/editor/1392/efc3ca87-13be-4106-8fd9-00e7a750eae37c717bf1-4155-4a5c-be55-c5903c1eef3e.png",
                "slicedImg/editor/1392/efc3ca87-13be-4106-8fd9-00e7a750eae3256e2eb3-7783-4c39-9363-ab0d24017dc4.png",
                "slicedImg/editor/1913/af14f7d6-bb04-4359-a751-e67a2051329495de75b2-6862-41a8-b118-c9d89867ffdf.png",
            ],
        },
    }
}


def grab(path, dest):
    req = urllib.request.Request(CDN + path, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=45).read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def main(brand):
    products = ASSETS[brand]
    root = os.path.join("brands", brand)
    total = 0
    for slug, groups in products.items():
        for group, paths in groups.items():
            outdir = os.path.join(root, "oy", group)
            os.makedirs(outdir, exist_ok=True)
            for i, p in enumerate(paths, 1):
                ext = os.path.splitext(p)[1] or ".jpg"
                name = f"{slug}-{i:02d}{ext}"
                dest = os.path.join(outdir, name)
                try:
                    n = grab(p, dest)
                    total += n
                    print(f"  {n/1024:8.0f}KB  {group}/{name}")
                except Exception as e:
                    print(f"  FAIL          {group}/{name}  {e}")
    print(f"\n合共 {total/1024/1024:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "glint")
