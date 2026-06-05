import { BaseComponent } from '../BaseComponent';
import { Lcd2004I2CUI } from './ui';

export default class OpenHWLcd2004I2C extends BaseComponent {
    constructor() {
        super(require('./manifest.json'));
    }

    getUI() {
        return Lcd2004I2CUI;
    }
}
