// Vercel Web Analytics initialization
// Using dynamic import for better browser compatibility
(async () => {
  try {
    const { inject } = await import('https://cdn.jsdelivr.net/npm/@vercel/analytics@1/+esm');
    inject();
  } catch (error) {
    console.warn('Failed to load Vercel Analytics:', error);
  }
})();
