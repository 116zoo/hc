import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const WEB_FONT_PROFILE_ENV = 'OPENBITFUN_WEB_FONT_PROFILE';
export const APPLE_SYSTEM_FONT_PROFILE = 'apple-system';
export const HARMONY_BUNDLED_FONT_PROFILE = 'harmony-bundled';

export const HARMONY_FONT_ASSETS = Object.freeze([
  {
    relativePath: 'base/HarmonyOS_Sans.ttf',
    bytes: 342_076,
    sha256: '72D5ADB60242FAE60686CA94C27E10B89CB7ED2008531390D3F22AC61AD64593',
  },
  {
    relativePath: 'sc/HarmonyOS_Sans_SC.ttf',
    bytes: 20_617_156,
    sha256: '8978E05044E7089AD6A9DE38C505C8148305607983487435A916D2610700A7CA',
  },
  {
    relativePath: 'LICENSE.txt',
    bytes: 32_766,
    sha256: '7D7ACF8E3AC928AE7F34AAA9F8E348DD0476DBB52CAAA058E402894D4F6EFE73',
  },
]);

export const SOURCE_SERIF_4_FONT_ASSETS = Object.freeze([
  {
    relativePath: 'source-serif-4/SourceSerif4-Regular.ttf',
    bytes: 268_589,
    sha256: '17CD279F16F169747997A5A4C1703FABE2CBB4D5394E372B11535E8F7762AB4B',
  },
  {
    relativePath: 'source-serif-4/SourceSerif4-Medium.ttf',
    bytes: 268_576,
    sha256: '317E5F4751D061109EA88443F9BC9923DC8691E4B9CF63BB7D53AC9F7621E411',
  },
  {
    relativePath: 'source-serif-4/SourceSerif4-SemiBold.ttf',
    bytes: 268_604,
    sha256: 'ED4D249162092BA07F6743DC960A2954AE64F33EEA588301916A4502D35C9F97',
  },
  {
    relativePath: 'source-serif-4/SourceSerif4-Bold.ttf',
    bytes: 268_552,
    sha256: '8899064EC540856E39E4B8A95647FB4CC07680B875A9EC690E9946F6910FD258',
  },
  {
    relativePath: 'source-serif-4/SourceSerif4VF.ttf',
    bytes: 268_505,
    sha256: '20FB4628F63B1ACC808DFDF768B3D14F7C6635CF0D425A67BB99BE1765D12AA3',
  },
]);

const HARMONY_FONT_STEMS = Object.freeze(
  HARMONY_FONT_ASSETS
    .filter(({ relativePath }) => relativePath.endsWith('.ttf'))
    .map(({ relativePath }) => relativePath.split('/').at(-1).replace(/\.ttf$/, '')),
);

const SOURCE_SERIF_4_FONT_STEMS = Object.freeze(
  SOURCE_SERIF_4_FONT_ASSETS
    .filter(({ relativePath }) => relativePath.endsWith('.ttf'))
    .map(({ relativePath }) => relativePath.split('/').at(-1).replace(/\.ttf$/, '')),
);

const FIRA_FONT_STEMS = Object.freeze([
  'FiraCode-Regular',
  'FiraCode-Medium',
  'FiraCode-SemiBold',
  'FiraCode-VF',
]);

export const FIRA_CODE_FONT_ASSETS = Object.freeze([
  {
    relativePath: 'fira-code/FiraCode-Regular.woff2',
    bytes: 0,
    sha256: '',
  },
  {
    relativePath: 'fira-code/FiraCode-Medium.woff2',
    bytes: 0,
    sha256: '',
  },
  {
    relativePath: 'fira-code/FiraCode-SemiBold.woff2',
    bytes: 0,
    sha256: '',
  },
  {
    relativePath: 'fira-code/FiraCode-VF.woff2',
    bytes: 0,
    sha256: '',
  },
]);

const PRODUCT_FONT_ASSET_PATTERN = /(?:HarmonyOS[_-]Sans|FiraCode-|Noto[_-]Sans[_-]SC|SourceSerif4)[^/]*\.(?:ttf|otf|woff2?)$/i;

export function normalizeWebFontProfile(value) {
  if (value === APPLE_SYSTEM_FONT_PROFILE || value === HARMONY_BUNDLED_FONT_PROFILE) {
    return value;
  }
  throw new Error(
    `Unsupported ${WEB_FONT_PROFILE_ENV} value: ${value}. `
      + `Expected ${APPLE_SYSTEM_FONT_PROFILE} or ${HARMONY_BUNDLED_FONT_PROFILE}.`,
  );
}

export function resolveWebFontProfile({ requested, command = 'build', platform = process.platform } = {}) {
  if (requested) return normalizeWebFontProfile(requested);

  // A portable Web build must carry the non-Apple face. Development follows
  // the host so macOS never downloads product font packages merely to run HMR.
  if (command === 'serve' && platform === 'darwin') {
    return APPLE_SYSTEM_FONT_PROFILE;
  }
  return HARMONY_BUNDLED_FONT_PROFILE;
}

export function fontProfileForDesktopTarget({ target, platform = process.platform } = {}) {
  if (target) {
    return /apple/i.test(target)
      ? APPLE_SYSTEM_FONT_PROFILE
      : HARMONY_BUNDLED_FONT_PROFILE;
  }
  return platform === 'darwin'
    ? APPLE_SYSTEM_FONT_PROFILE
    : HARMONY_BUNDLED_FONT_PROFILE;
}

export function verifyHarmonyFontSources(assetRoot) {
  for (const expected of HARMONY_FONT_ASSETS) {
    const source = readFileSync(join(assetRoot, 'harmonyos-sans', ...expected.relativePath.split('/')));
    const actualHash = createHash('sha256').update(source).digest('hex').toUpperCase();
    if (source.byteLength !== expected.bytes || actualHash !== expected.sha256) {
      throw new Error(
        `HarmonyOS Sans source changed: ${expected.relativePath}. `
          + `Expected ${expected.bytes} bytes / ${expected.sha256}, `
          + `received ${source.byteLength} bytes / ${actualHash}.`,
      );
    }
  }

  for (const expected of SOURCE_SERIF_4_FONT_ASSETS) {
    const source = readFileSync(join(assetRoot, 'source-serif-4', ...expected.relativePath.split('/').slice(1)));
    const actualHash = createHash('sha256').update(source).digest('hex').toUpperCase();
    if (source.byteLength !== expected.bytes || actualHash !== expected.sha256) {
      throw new Error(
        `Source Serif 4 source changed: ${expected.relativePath}. `
          + `Expected ${expected.bytes} bytes / ${expected.sha256}, `
          + `received ${source.byteLength} bytes / ${actualHash}.`,
      );
    }
  }

  const expectedFontPaths = new Set([
    ...HARMONY_FONT_ASSETS
      .filter(({ relativePath }) => relativePath.endsWith('.ttf'))
      .map(({ relativePath }) => `harmonyos-sans/${relativePath}`.toLowerCase()),
    ...SOURCE_SERIF_4_FONT_ASSETS
      .filter(({ relativePath }) => relativePath.endsWith('.ttf'))
      .map(({ relativePath }) => relativePath.toLowerCase()),
    ...FIRA_CODE_FONT_ASSETS
      .map(({ relativePath }) => relativePath.toLowerCase()),
  ]);
  const unexpectedFonts = listFontFiles(assetRoot).filter(
    (relativePath) => !expectedFontPaths.has(relativePath.toLowerCase()),
  );
  if (unexpectedFonts.length > 0) {
    throw new Error(
      `Font assets contain unapproved font files: ${unexpectedFonts.join(', ')}`,
    );
  }
}

export function assertWebFontProfileBundle(profile, bundleFileNames) {
  const normalized = normalizeWebFontProfile(profile);
  const names = [...bundleFileNames];
  const productFonts = names.filter((name) => PRODUCT_FONT_ASSET_PATTERN.test(name));

  if (normalized === APPLE_SYSTEM_FONT_PROFILE) {
    if (productFonts.length > 0) {
      throw new Error(
        `Apple Web bundle contains product text fonts: ${productFonts.join(', ')}`,
      );
    }
    return;
  }

  const expectedStems = [...HARMONY_FONT_STEMS, ...FIRA_FONT_STEMS, ...SOURCE_SERIF_4_FONT_STEMS];
  const matchesByStem = new Map(
    expectedStems.map((stem) => [
      stem,
      productFonts.filter((name) => matchesFontStem(name, stem)),
    ]),
  );
  const missing = expectedStems.filter((stem) => matchesByStem.get(stem).length === 0);
  if (missing.length > 0) {
    throw new Error(`Harmony Web bundle is missing font assets: ${missing.join(', ')}`);
  }

  const duplicated = expectedStems.filter((stem) => matchesByStem.get(stem).length > 1);
  if (duplicated.length > 0) {
    throw new Error(`Harmony Web bundle contains duplicate font assets: ${duplicated.join(', ')}`);
  }

  const unexpectedFonts = productFonts.filter(
    (name) => !expectedStems.some((stem) => matchesFontStem(name, stem)),
  );
  if (unexpectedFonts.length > 0) {
    throw new Error(
      `Harmony Web bundle contains unapproved font assets: ${unexpectedFonts.join(', ')}`,
    );
  }

  const wrongFormats = expectedStems.flatMap((stem) => {
    const expectedExtension = HARMONY_FONT_STEMS.includes(stem) || SOURCE_SERIF_4_FONT_STEMS.includes(stem) ? '.ttf' : '.woff2';
    return matchesByStem.get(stem).filter(
      (name) => !name.toLowerCase().endsWith(expectedExtension),
    );
  });
  if (wrongFormats.length > 0) {
    throw new Error(
      `Harmony Web bundle contains font assets in unapproved formats: ${wrongFormats.join(', ')}`,
    );
  }

  for (const legalFile of [
    'third-party/fonts/harmonyos-sans/LICENSE.txt',
    'third-party/fonts/harmonyos-sans/NOTICE.txt',
    'third-party/fonts/fira-code/LICENSE.txt',
    'third-party/fonts/source-serif-4/LICENSE.txt',
  ]) {
    if (!names.includes(legalFile)) {
      throw new Error(`Harmony Web bundle is missing legal asset: ${legalFile}`);
    }
  }
}

function matchesFontStem(path, stem) {
  const fileName = path.split('/').at(-1);
  // Match the asset/hash boundary so the base family cannot also match SC or
  // the retired per-weight faces.
  return fileName.startsWith(`${stem}-`) || fileName.startsWith(`${stem}.`);
}

function listFontFiles(root, current = root, prefix = '') {
  const paths = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      paths.push(...listFontFiles(root, join(current, entry.name), relativePath));
    } else if (/\.(?:ttf|otf|woff2?)$/i.test(entry.name)) {
      paths.push(relativePath);
    }
  }
  return paths.sort();
}
