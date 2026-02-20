let cached: string | undefined;

export function getVkPlatform(): string | undefined {
  if (cached !== undefined) return cached || undefined;
  const params = new URLSearchParams(window.location.search);
  cached = params.get('vk_platform') ?? '';
  return cached || undefined;
}

export function isDesktopWeb(): boolean {
  return getVkPlatform() === 'desktop_web';
}
