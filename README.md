# AI Reference Library · English Edition (Faces / Poses / Outfits)

<img width="2404" height="1728" alt="Image" src="https://github.com/user-attachments/assets/6a53ac45-4c89-48fd-a7b4-2e6788a5294a" />

An English-language website for the three public AI image-generation reference libraries published by **あぎ / ギア ([@giaaibusi](https://x.com/giaaibusi))**. It is a translation of the Chinese edition, [ai-ref-library-cn](https://sleepyzone.online/ai-ref-library-cn/).

* All categories and tags are translated into English
* Search by English name or Japanese name
* One-click copy of the image-generation prompt
* One entry point for all three libraries; the Poses library supports depth maps
* **Random combos that generate a prompt for you.**

**Live site (Chinese edition)**: <https://sleepyzone.online/ai-ref-library-cn/>

## Contents

- [Random combo](#random-combo): draw a face / outfit / pose at once and generate a prompt
  - [Two reference-image modes](#two-reference-image-modes): links vs. a single 3-panel sheet
- [Local development](#local-development)
- [Original image downloads](#original-image-downloads)
- [Analytics](#analytics)
- [License](#license)
- [Disclaimer](#disclaimer)

## Random combo

Click **Random combo** at the top: one entry is drawn at random from each of the Faces, Outfits and Poses libraries, the three reference images are shown side by side, and a ready-to-use prompt is generated.

- **Reroll individually**: swap just one of the three and leave the others alone — handy for locking in a face first and then choosing clothes
- **Limit the range**: poses can be restricted to Standard / Upper body / Two-person, and outfits to Spring / Summer / Autumn / Winter / Lingerie / Party / Swimwear / Sexy

### Two reference-image modes

| Mode | Best for | What you get |
| --- | --- | --- |
| **Reference = links** | Agents that can fetch images from the web (Claude / GPT with browsing tools / coding agents with a shell) | A prompt containing direct source-site links to the three images plus curl fetch commands, opening with "fetch the images first — do not generate from the description alone" |
| **Reference = one 3-panel sheet** | Models that only accept pasted images and can't read URLs (most chat-style image models) | A one-click 2828×1380 3-panel reference sheet (left ① face / middle ② outfit / right ③ pose, with numbered labels) that you can download or copy straight to the clipboard |

<img width="1574" height="1628" alt="Image" src="https://github.com/user-attachments/assets/a698df0d-9fc6-48c2-a824-086736eb2e72" />

<img width="1620" height="1854" alt="Image" src="https://github.com/user-attachments/assets/17454dd8-3e23-47cc-8f6c-f3607bf7df6b" />

## Local development

    python3 -m http.server 8080

Then open http://localhost:8080

## Original image downloads

Note: for previewing high-resolution images locally only.

**AI face library**

[https://pan.baidu.com/s/1rxqVp0qkxCQf-8Z8DXI6HA?pwd=jR2P](https://pan.baidu.com/s/1rxqVp0qkxCQf-8Z8DXI6HA?pwd=jR2P)

[https://pan.quark.cn/s/469084c4f0fa](https://pan.quark.cn/s/469084c4f0fa)

**AI outfit library**

[https://pan.baidu.com/s/1bsGuveiCBRbucS-17tpTrg?pwd=s39e](https://pan.baidu.com/s/1bsGuveiCBRbucS-17tpTrg?pwd=s39e)

[https://pan.quark.cn/s/492b9782ab78](https://pan.quark.cn/s/492b9782ab78)

**AI pose library**

[https://pan.quark.cn/s/6b1004add615](https://pan.quark.cn/s/6b1004add615)

[https://pan.baidu.com/s/1rY8E88d19xabnoBGhex4zg?pwd=vsf6](https://pan.baidu.com/s/1rY8E88d19xabnoBGhex4zg?pwd=vsf6)

(Baidu Netdisk and Quark Drive are Chinese cloud services; the per-image "Download original" buttons on the site go to the author's source sites instead.)

## Analytics

**Currently enabled on this site: GA4 `G-0C99160522` + Microsoft Clarity `r1wmvdsf4a`.**

## License

| Library | License | Can images be redistributed? |
| --- | --- | --- |
| Faces | **CC0** (copyright waived) | ✅ Yes |
| Poses | Free for commercial use, modification and reference | ❌ No redistribution of the image files themselves (including modified versions) |
| Outfits | Same as above | ❌ No redistribution of the image files themselves |

- None of the three libraries involve real people (everything is AI-generated)
- The outfit library's author ran brand-similarity checks but **does not guarantee non-infringement** — use your own judgment before commercial use
- This repo only includes thumbnails for search; download originals from the source sites, and **do not bundle and redistribute the originals**

| Library | Content | Count | Source site |
| --- | --- | --- | --- |
| Faces | Front-facing head references on plain backgrounds (face close-ups 893 / styled 606) | 1,499 images | <https://ai-portrait-gallery.pages.dev/> |
| Poses | Faceless grey mannequin line drawings, 5 camera angles per pose | 288 poses / 1,439 images | <https://ai-pose-gallery.pages.dev/> |
| Outfits | Clothing-only references with no person (8 categories) | 1,407 sets | <https://ai-costume-gallery.pages.dev/> |

## Disclaimer

Copyright of the materials belongs to the original author. This repo is a personal-use English search interface, provided as-is without warranty.

---

[↑ Back to contents](#contents)
