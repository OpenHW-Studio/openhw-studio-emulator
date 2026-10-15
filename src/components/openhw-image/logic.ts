import { BaseComponent } from '../BaseComponent';

export class OpenHWImageLogic extends BaseComponent {
  reset() {}
  update() {}

    // 12.4 v2: numeric UI state for SAB slot {} (via getSyncState snapshot).
    uiState() {
        const s: any = (typeof (this as any).getSyncState === 'function')
            ? ((this as any).getSyncState() || {}) : ((this as any).state || {});
        return {
            f: {},
            i: {},
        };
    }
    validate(_component: any, _graph: Map<string, string[]>) {
        return null;
    }
}
