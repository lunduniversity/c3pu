# c3pu

c3pu is a simplified, simulated 8-bit computer used to teach the idea that
data and machine instructions are both "just bytes." A student writes or
loads a program directly as raw binary bytes into a small memory, edits that
memory, sees it simultaneously decoded as data (hex/decimal/ASCII) and as a
candidate CPU instruction, then steps or runs it and watches registers,
memory, and output change in real time.

Memory size and the instruction set are deliberately minimal — 256 bytes,
about 15 instructions, 8 registers — so the whole machine can be held in a
student's head at once. It's aimed at students in an intro programming or
computer-systems course, and at the instructors/course staff who prepare
example programs for them.

This is a from-scratch TypeScript/React rewrite of an original Java/Swing
desktop version of c3pu, distributed as a single self-contained HTML file
instead of a desktop application — no install, no server, works offline
once downloaded. See [`docs/webapp-requirements.md`](docs/webapp-requirements.md)
for the full functional specification and [`docs/tech-stack.md`](docs/tech-stack.md)
for the tooling choices behind it.

## Running it

The easiest way to use c3pu is to download the pre-built app from this
repository's [latest release](../../releases/latest):

1. Go to the [Releases](../../releases) page and open the latest release.
2. Download the `.html` file attached to it.
3. Open that file in your browser (double-click it, or use your browser's
   Open File dialog) — everything the app needs is bundled into that one
   file, so there's nothing else to install or configure.

Works in any evergreen desktop browser (current Chrome, Firefox, or Edge on
Windows; current Safari on macOS). Since it's a single static file, you can
also copy it to a USB drive, email it, or host it on any web server if you'd
rather open it over `http(s)://` than as a local file.

## Building from source

If you'd rather build the app yourself:

**Prerequisites:** Node.js (a recent LTS release, 20+) and npm.

```bash
git clone <this-repository-url>
cd c3pu
npm install
npm run build
```

The build output is a single file at `dist/index.html` — open it directly
in a browser, the same way as a downloaded release.

### Running it locally during development

```bash
npm run dev       # Vite dev server with hot reload, for active development
npm run preview   # serves the production build in dist/ - closest to the real thing
```

`npm run dev` is best while making changes; `npm run preview` (after
`npm run build`) is the most accurate way to check the app behaves the same
way the built single-file release will.

Other useful commands:

```bash
npm test        # run the test suite (Vitest)
npm run lint    # run ESLint
```

See [`CLAUDE.md`](CLAUDE.md) for a deeper tour of the codebase's
architecture if you're planning to make changes.

## Releasing a new version

Releases are cut from `main` and published automatically by CI. To ship
whatever is currently on `main`:

```bash
npm run release
```

This prompts for the release type (patch/minor/major), bumps the version in
`package.json`, and creates + pushes a commit and a `vX.Y.Z` tag. Pushing
that tag triggers the `Release` GitHub Actions workflow
([`.github/workflows/release.yml`](.github/workflows/release.yml)), which
builds, lints, tests, and — if all of that passes — publishes a GitHub
Release with the built `.html` file attached and its notes auto-generated
from the commits since the previous release.

The `.html` file is attached under the same fixed name (`c3pu.html`) on
every release, so this link always serves the latest one without needing to
be updated:

```
https://github.com/lunduniversity/c3pu/releases/latest/download/c3pu.html
```

If the release workflow fails, the tag and commit already pushed stay as-is
— don't try to move or delete the tag, and don't force-push a fix onto it.
For a one-off/transient failure (flaky test, network blip), just re-run the
failed workflow from the Actions tab — it re-runs against the same tagged
commit. For an actual bug, fix it on `main` and cut a new patch release
(`npm run release` → patch); the tag stays pinned to the commit that failed,
so a real fix always needs a new version. The `main` branch also runs the
same lint/test/build steps on every push/PR
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), so a broken build
should rarely reach the point of tagging a release in the first place.

Git tags plus the GitHub [Releases](../../releases) page (each release
records exactly which commit and notes it came from) already form a
version-controlled release log, so there's no separate changelog file to
keep in sync.
