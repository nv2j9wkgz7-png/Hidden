# Hidden brand

The app name is **Hidden**. The mark is a bold capital H with a blurred photograph inside and a transparent background. The photographic content is blurred until no scene is identifiable. A subtle outer blur softens the H silhouette while keeping the letter readable.

- Header asset: `public/hidden-logo.svg` (self-contained SVG)
- Browser icon: `src/app/icon.svg`
- Generated with the built-in image-generation tool; no external API key used.

The SVG supplies an exact geometric H clipping path over the unchanged generated photograph, defining the letter before the final soft-edge blur. The raster source is retained at `public/hidden-logo.png`.

## Initial prompt

Use case: logo-brand. Create a production logo asset for an image delivery app named Hidden. The asset is ONLY one uppercase H, no wordmark or other text. A bold, clean geometric sans-serif capital H with thick vertical stems and horizontal crossbar, straight-on flat silhouette, crisp sharply defined outer and inner edges. Inside the entire H shape is one continuous photographic image that has been strongly defocused/blurred as if hidden behind a privacy preview: soft violet-blue twilight sky, muted peach light and deep indigo landscape forms, recognizably blurred photo texture rather than a plain gradient. The blur belongs only to the image clipped INSIDE the H; the silhouette stays sharp. Genuine transparent alpha background everywhere outside the H including the two openings. No backdrop, no square tile, no checkerboard drawn into the image, no outline, no glow, no drop shadow, no 3D bevel, no other objects. Square 1024x1024 canvas, centered H occupying approximately 85% of canvas height and 75% of width, minimal even padding. Should read clearly as H at small UI sizes. Return transparent PNG.

## Final refinement prompt

Refine this exact Hidden H logo only by cleaning its silhouette and transparent background. Preserve the same H proportions and blurred purple/peach sunset landscape inside the H. Make every external and internal edge geometrically straight, smooth and sharply defined. Remove ALL stray speckles, blue/pink fringe and white remnants around the edges and in the openings. Outside the H and in both openings must be completely empty transparent alpha, no visible colored or white pixels. No shadow or glow. Preserve the blur and photograph entirely inside the H. Transparent PNG.

## Stronger privacy treatment

The SVG applies a 110-unit Gaussian blur to the embedded photograph before clipping it to the H, followed by a 6-unit blur on the letter edge. Both are native SVG filters; transparency is preserved and no new image generation was needed for this refinement.
