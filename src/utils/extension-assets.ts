import * as fs from 'fs';
import * as path from 'path';

function isExtensionRoot(candidate: string): boolean {
    return fs.existsSync(path.join(candidate, 'package.json'))
        && fs.existsSync(path.join(candidate, 'styles'))
        && fs.existsSync(path.join(candidate, 'webviews'));
}

export function getExtensionRootPath(): string {
    const candidates = [
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '..', '..')
    ];

    return candidates.find(isExtensionRoot) || candidates[0];
}

export function getExtensionAssetPath(...segments: string[]): string {
    return path.join(getExtensionRootPath(), ...segments);
}