import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Paths
const ROOT_DIR = process.cwd();
const CHANGELOG_PATH = join(ROOT_DIR, 'src', 'pages', 'Changelog.tsx');
const PACKAGE_JSON_PATH = join(ROOT_DIR, 'package.json');
const VERSION_TS_PATH = join(ROOT_DIR, 'src', 'lib', 'version.ts');
const IOS_PROJECT_PATH = join(ROOT_DIR, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

// regex helpers
const CHANGELOG_VERSION_REGEX = /version: 'v(\d+)\.(\d+)\.(\d+)'/;
const CHANGELOG_DATE_REGEX = /date: '(\d{4}-\d{2}-\d{2})'/;

function updateVersion() {
    console.log('🔄 syncing version numbers...');

    // 1. Read latest version from Changelog
    const changelogContent = readFileSync(CHANGELOG_PATH, 'utf-8');
    const versionMatch = changelogContent.match(CHANGELOG_VERSION_REGEX);
    const dateMatch = changelogContent.match(CHANGELOG_DATE_REGEX);

    if (!versionMatch || !dateMatch) {
        console.error('❌ Could not find version or date in Changelog.tsx');
        process.exit(1);
    }

    const [_, major, minor, patch] = versionMatch;
    const versionString = `${major}.${minor}.${patch}`;
    const dateString = dateMatch[1];

    console.log(`📍 Found version: ${versionString} (${dateString})`);

    // 2. Update package.json
    const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const oldPackageVersion = packageJson.version;
    packageJson.version = versionString;
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ package.json: ${oldPackageVersion} -> ${versionString}`);

    // 3. Update src/lib/version.ts
    let versionTsContent = readFileSync(VERSION_TS_PATH, 'utf-8');

    // Update major, minor, patch
    versionTsContent = versionTsContent.replace(/major: \d+,/, `major: ${major},`);
    versionTsContent = versionTsContent.replace(/minor: \d+,/, `minor: ${minor},`);
    versionTsContent = versionTsContent.replace(/patch: \d+,/, `patch: ${patch},`);

    // Update stage to stable (remove 'beta' or set to 'stable' if we want explicit)
    // The user plan said "Remove stage: 'beta' (or update to stable)"
    // I'll set it to 'stable' for now for safety, or clear it. 
    // Let's look at the file content: `stage: 'beta' as const,`
    // I will change it to `stage: 'stable' as const,`
    versionTsContent = versionTsContent.replace(/stage: 'beta' as const,/, `stage: 'stable' as const,`);

    // Update BUILD_DATE
    versionTsContent = versionTsContent.replace(/export const BUILD_DATE = '.*';/, `export const BUILD_DATE = '${dateString}';`);

    writeFileSync(VERSION_TS_PATH, versionTsContent);
    console.log(`✅ src/lib/version.ts updated`);

    // 4. Update iOS project
    let pbxprojContent = readFileSync(IOS_PROJECT_PATH, 'utf-8');

    // MARKETING_VERSION
    const marketingRegex = /MARKETING_VERSION = .*;/g;
    pbxprojContent = pbxprojContent.replace(marketingRegex, `MARKETING_VERSION = ${versionString};`);

    // CURRENT_PROJECT_VERSION
    const projectVersionRegex = /CURRENT_PROJECT_VERSION = .*;/g;
    pbxprojContent = pbxprojContent.replace(projectVersionRegex, `CURRENT_PROJECT_VERSION = ${versionString};`);

    writeFileSync(IOS_PROJECT_PATH, pbxprojContent);
    console.log(`✅ iOS project version updated`);

    console.log('✨ Version sync complete!');
}

updateVersion();
