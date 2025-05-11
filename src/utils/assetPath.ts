export function getAssetPath(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // In development, we want to keep the path relative
    if (import.meta.env.DEV) {
        return `/${cleanPath}`;
    }
    
    // In production, add the base path
    return `/90degreeski/${cleanPath}`;
} 