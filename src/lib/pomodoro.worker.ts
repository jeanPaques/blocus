// Background ticker: workers are not throttled like hidden tabs' timers.
let end = 0;
let timer: ReturnType<typeof setInterval> | undefined;
self.onmessage = (e: MessageEvent<{ cmd: "start" | "stop"; ms?: number }>) => {
  clearInterval(timer);
  if (e.data.cmd === "start") {
    end = Date.now() + (e.data.ms ?? 0);
    timer = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      self.postMessage({ left });
      if (left === 0) clearInterval(timer);
    }, 250);
  }
};
