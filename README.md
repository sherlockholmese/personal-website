# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.15.3 create --template minimal --types ts --add prettier eslint tailwindcss="plugins:typography" --install bun .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

## Private R2 storage

Downloads and photography are streamed through the SvelteKit server from a private
Cloudflare R2 bucket. No R2 credentials or signed bucket URLs are sent to the browser.
The existing Turnstile verification still protects `/dist/*`. Images under the photography prefix are visible to site visitors through
`/media/photography/*`; other bucket prefixes cannot be read through that endpoint.

Copy the R2 settings from `.env.example` into your `.env`:

- `R2_ACCOUNT_ID`: your Cloudflare account ID.
- `R2_BUCKET_NAME`: the private bucket name.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`: R2 S3 credentials with Object Read
  permission scoped to this bucket, including listing objects.
- `R2_ENDPOINT`: optional full S3 API endpoint for a jurisdiction-specific bucket;
  otherwise `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` is used.
- `R2_DIST_PREFIX`: defaults to `dists`.
- `R2_PHOTOGRAPHY_PREFIX`: defaults to `photography`.

Keep the bucket's public access disabled. Upload your files using these object keys,
preserving the nested directories:

```text
dists/iycep2026/pwn/cat/dist.zip
dists/iycep2026/pwn/dog/dist.zip
dists/iycep2026/pwn/missing-santa/dist.zip
dists/iycep2026/pwn/student-learning-space/dist.zip
photography/DSC01407_watermark.jpg
photography/DSC01408_watermark.jpg
```

For example, the existing `::dist[Download challenge files]{file="iycep2026/pwn/cat/dist.zip"}`
link reads `dists/iycep2026/pwn/cat/dist.zip`. Blog download links require no edits.
Upload the contents of local `dists/` under `dists/` and local `static/photography/`
under `photography/`. Local files remain available for migration, but the UI has no
local-file fallback. Docker excludes them from the image and no longer mounts `dists/`.
Restart the server after configuring `.env`.

HEAD, byte ranges, conditional requests, and streamed responses are supported.
Downloads retain private, no-store caching; published images can be cached for one
hour. Replace an image under a new filename if it must update immediately.
An unconfigured bucket returns 503; R2 failures return a generic error without
exposing credentials or upstream error details.

## Photography gallery

`photography` and `/photography` show a single gallery, discovered automatically by
listing images under `R2_PHOTOGRAPHY_PREFIX` (for example `photography/*.jpg`). Upload or delete an image in
R2 and the gallery updates on the next request after its one-minute listing cache
expires. Listing follows pagination, so all nested folders are included. Keep this
prefix for images you intend to publish. There is no hardcoded photograph list.

- `PHOTOGRAPHY_HEADER_KEY` selects the one fixed full-width header image, relative
  to the photography prefix. It defaults to `DSC01407_watermark.jpg`.
  That image is shown once, above the remaining photos.
- `PHOTOGRAPHY_CDN_URL` optionally sets the image URL base, for example
  `https://cdn.example.com/media/photography`. Configure that hostname to cache and
  forward this site's photo route; the R2 bucket remains private. Leave it empty
  to use the same-origin `/media/photography` route, which Cloudflare can cache.

Photos load lazily. Select one to open the full-size viewer and close it to return
to the same gallery position. The Photography heading shares the blog post title's
font size, weight, and mobile scaling.

Camera, lens, and capture date are read on demand from embedded EXIF/XMP metadata,
using a bounded 256 KiB header request to R2. JPEG EXIF/XMP and PNG/WebP EXIF are
supported. Missing or stripped metadata is omitted; no camera values are guessed.
The parser returns only camera, date, and dimensions. Metadata results are cached
for one hour. Image files without supported embedded metadata still display normally.

Photos also appear in the virtual filesystem under `~/photography`, preserving
R2 subfolders. `cat` opens their viewer. Existing folder-based photo URLs continue
to work, and folder URLs open the same complete gallery. Unique filename-only
photo URLs are supported too.

## Protected email reveal

The `socials` terminal command keeps the contact email server-side and reveals it only after
Cloudflare Turnstile verification. Create a Turnstile widget in Cloudflare, copy `.env.example`
to `.env`, and configure:

- `PUBLIC_TURNSTILE_SITE_KEY`: the public widget site key.
- `TURNSTILE_SECRET_KEY`: the private Siteverify secret.
- `TURNSTILE_HOSTNAME`: the exact production hostname returned by Siteverify.
- `TRUST_CLOUDFLARE_IP_HEADER`: set to `true` only when the origin accepts traffic exclusively
  through Cloudflare; otherwise the limiter uses the direct client address.
- `CONTACT_EMAIL`: the address returned after successful verification.
- `DOWNLOAD_ACCESS_SECRET`: a random secret used to sign short-lived distribution download
  access cookies. Generate at least 32 random characters and keep it server-side.

Local development uses Cloudflare's always-pass test keys when the Turnstile keys are omitted.
`CONTACT_EMAIL` must still be set. Production deliberately has no key fallback.
Restart the development server or production container after changing `.env`; environment files
are read when the process starts.

The endpoint validates the Turnstile action and optional hostname, returns `Cache-Control:
no-store`, and applies a small per-process request limit. For deployments with multiple
instances, also apply a Cloudflare rate-limiting rule to `POST /api/contact-email`.
The Docker build context excludes `.env` files so the contact address and Turnstile secret are
not copied into image layers.

Distribution links use the same Turnstile widget with a separate action. Successful verification
sets a signed, HTTP-only access cookie for ten minutes. `/dist/*` rejects requests without that
cookie and serves authorized files with private, no-store caching while retaining HEAD and byte
range support. Apply a Cloudflare rate-limiting rule to `POST /api/dist-access` in production.
After first deploying the gate, purge any previously cached `/dist/*` responses and ensure
Cloudflare cache rules do not override the route's private, no-store response header.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
