type Bridge = {
  syncFromStorage: () => Promise<void>;
  clearLocal: () => void;
};

let bridge: Bridge | null = null;

export function registerAuthHttpBridge(next: Bridge): void {
  bridge = next;
}

export const authHttpBridge = {
  async syncFromStorage(): Promise<void> {
    if (!bridge) return;
    await bridge.syncFromStorage();
  },
  clearLocal(): void {
    bridge?.clearLocal();
  },
};
