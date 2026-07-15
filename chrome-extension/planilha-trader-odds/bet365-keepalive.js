(() => {
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  const fallbackFrames = new Map();
  let fallbackFrameId = 1000000000;
  const actuallyHidden = () => {
    try {
      return !!hiddenDescriptor?.get?.call(document);
    } catch (_) {
      return false;
    }
  };
  const defineGetter = (target, property, value) => {
    try {
      Object.defineProperty(target, property, {
        configurable: true,
        get: () => value
      });
    } catch (_) {}
  };

  defineGetter(Document.prototype, 'hidden', false);
  defineGetter(Document.prototype, 'visibilityState', 'visible');
  defineGetter(document, 'hidden', false);
  defineGetter(document, 'visibilityState', 'visible');

  window.requestAnimationFrame = callback => {
    if (!actuallyHidden()) return nativeRequestAnimationFrame(callback);
    const id = fallbackFrameId += 1;
    const timer = setTimeout(() => {
      fallbackFrames.delete(id);
      callback(performance.now());
    }, 50);
    fallbackFrames.set(id, timer);
    return id;
  };

  window.cancelAnimationFrame = id => {
    const timer = fallbackFrames.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      fallbackFrames.delete(id);
      return;
    }
    nativeCancelAnimationFrame(id);
  };

  try {
    window.addEventListener('visibilitychange', event => event.stopImmediatePropagation(), true);
    document.addEventListener('visibilitychange', event => event.stopImmediatePropagation(), true);
    window.addEventListener('pagehide', event => event.stopImmediatePropagation(), true);
  } catch (_) {}
})();
