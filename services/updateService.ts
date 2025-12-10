import { getVersion } from '@tauri-apps/api/app';

export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    published_at: string;
    prerelease: boolean;
    draft: boolean;
}

/**
 * Checks for updates from GitHub releases
 * @returns The latest release if a newer version is available, null otherwise
 */
export async function checkForUpdates(): Promise<{ hasUpdate: boolean; latestRelease?: GitHubRelease; currentVersion: string }> {
    try {
        const currentVersion = await getVersion();
        console.log('[Update Checker] Current version:', currentVersion);

        // Fetch latest release from GitHub
        const response = await fetch('https://api.github.com/repos/daocatt/keedavault/releases/latest');

        if (!response.ok) {
            throw new Error(`GitHub API returned ${response.status}`);
        }

        const latestRelease: GitHubRelease = await response.json();
        console.log('[Update Checker] Latest release:', latestRelease.tag_name);

        // Skip drafts and prereleases
        if (latestRelease.draft || latestRelease.prerelease) {
            console.log('[Update Checker] Latest release is draft or prerelease, skipping');
            return { hasUpdate: false, currentVersion };
        }

        // Compare versions (remove 'v' prefix if present)
        const currentVer = currentVersion.replace(/^v/, '');
        const latestVer = latestRelease.tag_name.replace(/^v/, '');

        const hasUpdate = compareVersions(latestVer, currentVer) > 0;
        console.log('[Update Checker] Has update:', hasUpdate);

        return {
            hasUpdate,
            latestRelease: hasUpdate ? latestRelease : undefined,
            currentVersion
        };
    } catch (error) {
        console.error('[Update Checker] Failed to check for updates:', error);
        throw error;
    }
}

/**
 * Compare two semantic versions
 * @returns 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;

        if (aPart > bPart) return 1;
        if (aPart < bPart) return -1;
    }

    return 0;
}
