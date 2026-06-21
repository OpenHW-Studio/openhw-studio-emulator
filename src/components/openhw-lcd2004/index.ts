import { BaseComponent } from '../BaseComponent';
import { Lcd2004UI } from './ui';

export default class OpenHWLcd2004 extends BaseComponent {
    constructor() {
        super(require('./manifest.json'));
    }

    getUI() {
        return Lcd2004UI;
    }
}
