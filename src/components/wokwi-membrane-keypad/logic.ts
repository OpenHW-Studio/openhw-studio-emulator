import { BaseComponent } from '../BaseComponent';

export class MembraneKeypadLogic extends BaseComponent {
    private pressedIndices: Set<number>;

    constructor(id: string, manifest: any) {
        super(id, manifest);
        
        this.pressedIndices = new Set();
        
        this.state = {
            pressedKeys: []
        };
    }

    onEvent(event: any) {
        if (event.type === 'press' && event.index !== undefined) {
            this.pressedIndices.add(event.index);
            this.setState({ pressedKeys: Array.from(this.pressedIndices) });
        } else if (event.type === 'release' && event.index !== undefined) {
            this.pressedIndices.delete(event.index);
            this.setState({ pressedKeys: Array.from(this.pressedIndices) });
        }
    }

    getKeyRc(index: number): { row?: string, col?: string } {
        if (typeof index === 'number' && index >= 0 && index <= 15) {
            return { 
                row: `R${Math.floor(index / 4) + 1}`, 
                col: `C${(index % 4) + 1}` 
            };
        }
        return {};
    }

    getPressedKeys(): number[] {
        return Array.from(this.pressedIndices);
    }

    update() {
        // We do nothing in update natively. The shorting physics matrix handles the connections recursively.
    }
}