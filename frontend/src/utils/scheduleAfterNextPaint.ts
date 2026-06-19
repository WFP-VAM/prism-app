export function scheduleAfterNextPaint(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

export function scheduleAfterNextPaintAsync(): Promise<void> {
  return new Promise(resolve => {
    scheduleAfterNextPaint(resolve);
  });
}
