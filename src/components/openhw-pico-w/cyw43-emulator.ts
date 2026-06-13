export class BufferWriter {
    data: Uint8Array;
    view: DataView;
    offset: number = 0;
    littleEndian: boolean;

    constructor(data: Uint8Array, littleEndian = true) {
        this.data = data;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.littleEndian = littleEndian;
    }

    writeUint32(v: number) { this.view.setUint32(this.offset, v, this.littleEndian); this.offset += 4; }
    writeUint16(v: number) { this.view.setUint16(this.offset, v, this.littleEndian); this.offset += 2; }
    writeUint8(v: number) { this.view.setUint8(this.offset, v); this.offset += 1; }
    writeInt32(v: number) { this.view.setInt32(this.offset, v, this.littleEndian); this.offset += 4; }
    writeInt16(v: number) { this.view.setInt16(this.offset, v, this.littleEndian); this.offset += 2; }
    writeInt8(v: number) { this.view.setInt8(this.offset, v); this.offset += 1; }
    writeBytes(b: Uint8Array | number[]) { this.data.set(b, this.offset); this.offset += b.length; }
    writeChars(s: string, maxLen?: number) { 
        for (let i = 0; i < s.length && (!maxLen || i < maxLen); i++) {
            this.writeUint8(s.charCodeAt(i));
        }
    }
    skip(n: number) { this.offset += n; }
}

export class BufferReader {
    data: Uint8Array;
    view: DataView;
    offset: number = 0;
    littleEndian: boolean;

    constructor(data: Uint8Array, littleEndian = true) {
        this.data = data;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.littleEndian = littleEndian;
    }

    get remaining() { return this.data.length - this.offset; }
    
    readUint32() { const v = this.view.getUint32(this.offset, this.littleEndian); this.offset += 4; return v; }
    readUint16() { const v = this.view.getUint16(this.offset, this.littleEndian); this.offset += 2; return v; }
    readUint8() { const v = this.view.getUint8(this.offset); this.offset += 1; return v; }
    readBytes(n: number) { const b = this.data.slice(this.offset, this.offset + n); this.offset += n; return b; }
    readChars(n: number) { 
        const chars = [];
        for (let i = 0; i < n; i++) chars.push(String.fromCharCode(this.readUint8()));
        return chars.join('');
    }
    readNullTerminated() {
        const chars = [];
        let c;
        while ((c = this.readUint8()) !== 0) chars.push(String.fromCharCode(c));
        return chars.join('');
    }
    skip(n: number) { this.offset += n; }
}

export class Cyw43Emulator {
    staMAC = new Uint8Array([0x28, 0xcd, 0xc1, 0x00, 0x12, 0x34]);
    cmd: any = null;
    buf: Uint32Array | null = null;
    ctrl = 0;
    bufIndex = 0;
    backplaneRead = false;
    sequence = 0;
    credit = 16;
    gpioValue = 0;
    int = 0;
    intEnable = 0;
    core0Reset = 1;
    core1Reset = 1;
    watermark = 0;
    events: Uint8Array[] = [];
    ksoOn = false;
    bpAddr = 0;
    
    // Callbacks to logic.ts
    onGPIOUpdated: (val: number) => void = () => {};
    onPacketTx: (packet: Uint8Array) => void = () => {};
    onIrqChanged: (irq: boolean) => void = () => {};

    vars: Record<string, Uint8Array> = {
        mcast_list: new Uint8Array([0, 0, 0, 0]),
        cur_etheraddr: this.staMAC,
        clmload_status: new Uint8Array([0])
    };

    private lastIrq = false;
    checkIrq() {
        const current = this.irq;
        console.log(`[Cyw43Emulator] checkIrq: current=${current}, int=0x${this.int.toString(16)}, intEnable=0x${this.intEnable.toString(16)}`);
        if (current !== this.lastIrq) {
            this.lastIrq = current;
            this.onIrqChanged(current);
        }
    }

    updateInterrupts() {
        if (this.events.length) {
            this.int |= 32;
        } else {
            this.int &= ~32;
        }
        this.checkIrq();
    }

    busRead(x: number, e: Uint32Array) {
        switch (x) {
            case 0:
                e[0] = this.ctrl;
                break;
            case 4:
                e[0] = this.int;
                break;
            case 6:
                e[0] = this.intEnable;
                break;
            case 8:
                e[0] = 32;
                if (this.events.length) {
                    e[0] |= 256;
                    e[0] |= (this.events[0].byteLength << 9) & 1048064;
                }
                break;
            case 20:
                e[0] = 4276993709; // 0xFEEDBEAD
                console.log(`[Cyw43Emulator] READ TEST_PATTERN 0xFEEDBEAD from bpAddr=${this.bpAddr.toString(16)}`);
                break;
        }
    }

    busWrite(x: number, e: Uint32Array) {
        switch (x) {
            case 0:
                this.ctrl = e[0];
                break;
            case 4:
                this.int &= ~e[0];
                this.updateInterrupts();
                break;
            case 6:
                this.intEnable = e[0];
                this.updateInterrupts();
        }
    }

    getBpAddr(x: number) {
        return (this.bpAddr + x) & -32769;
    }

    bpRead(x: number, e: Uint32Array) {
        switch (this.getBpAddr(x)) {
            case 403716096:
                e[0] = this.core0Reset;
                return;
            case 403715080:
                e[0] = 1;
                return;
            case 403720192:
                e[0] = this.core1Reset;
                return;
        }
        switch (x) {
            case 65544:
                e[0] = this.watermark;
                return;
            case 65550:
                e[0] = 200;
                break;
            case 65567:
                e[0] = this.ksoOn ? 3 : 0;
        }
    }

    bpWrite(x: number, e: Uint32Array) {
        switch (this.getBpAddr(x)) {
            case 403716096:
                this.core0Reset = e[0] & 1;
                return;
            case 403720192:
                this.core1Reset = e[0] & 1;
                return;
        }
        switch (x) {
            case 65544:
                this.watermark = e[0];
                return;
            case 65548:
                this.bpAddr = (this.bpAddr & 16777215) | (e[0] << 24);
                break;
            case 65547:
                this.bpAddr = (this.bpAddr & -16711681) | (e[0] << 16);
                break;
            case 65546:
                this.bpAddr = (this.bpAddr & -65281) | (e[0] << 8);
                break;
            case 65567:
                this.ksoOn = !!(e[0] & 1);
        }
    }

    wlanEvent(x: Uint8Array, e: number) {
        let f = new Uint8Array(12 + ((x.byteLength + 3) & -4));
        let t = new BufferWriter(f);
        t.writeUint16(f.length);
        t.writeUint16(~f.length);
        t.writeUint8(this.sequence++);
        t.writeUint8(e & 15);
        t.writeUint8(0);
        t.writeUint8(12);
        t.writeUint8(0);
        t.writeUint8(this.credit++);
        t.writeUint16(0);
        t.writeBytes(x);
        this.events.push(f);
        
        let channelName = "UNKNOWN";
        if (e === 0) channelName = "IOCTL_RESPONSE";
        else if (e === 1) channelName = "ASYNC_EVENT";
        else if (e === 2) channelName = "ETHERNET_DATA";
        console.log(`[Cyw43Emulator] wlanEvent: Queued packet (channel ${e} = ${channelName}, length: ${f.length} bytes)`);
        
        this.updateInterrupts();
    }

    writeFrame(e: Uint8Array) {
        let f = new Uint8Array(4 + e.byteLength);
        f.set(e, 4);
        const hex = Array.from(e.slice(0, 48)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`[Cyw43Emulator] writeFrame (DATA IN): len=${e.length} hex=${hex}`);
        this.wlanEvent(f, 2);
    }

    asyncEvent(x: number, e: number, f: number, t: number, d?: Uint8Array) {
        let a = new Uint8Array(76 + (d?.byteLength || 0));
        a[16] = 136;
        a[17] = 108;
        a[23] = 0;
        a[24] = 16;
        a[25] = 24;
        let c = new DataView(a.buffer, 28);
        c.setUint16(2, e, false);
        c.setUint32(4, x, false);
        c.setUint32(8, f, false);
        c.setUint32(12, t, false);
        if (d) {
            a.set(d, 76);
        }
        this.wlanEvent(a, 1);
    }

    scanResponse(x: any) {
        let e = new Uint8Array(140);
        let f = new BufferWriter(e, true);
        f.writeUint32(0);
        f.writeUint32(0);
        f.writeUint16(0);
        f.writeUint16(1);
        f.writeUint32(0);
        f.writeUint32(0);
        f.writeBytes(x.bssid);
        f.writeUint16(0);
        f.writeUint16(0);
        f.writeUint8(Math.min(x.ssid.length, 31));
        f.writeChars(x.ssid, 32);
        f.writeUint32(0);
        f.skip(16);
        f.writeUint16(x.channel);
        f.writeUint16(0);
        f.writeUint8(0);
        f.writeInt16(x.rssi);
        f.writeInt8(0);
        f.writeUint8(0);
        f.writeUint32(0);
        f.writeUint8(0);
        f.writeUint32(0);
        f.writeUint8(0);
        f.skip(3);
        f.skip(16);
        f.writeUint16(0);
        f.writeUint32(0);
        f.writeUint16(0);
        this.asyncEvent(69, 0, 8, 0, e);
    }

    ioctlResult(x: number, e: number, f?: Uint8Array) {
        let t = new Uint8Array(16 + (f ? f.byteLength : 0));
        let d = new BufferWriter(t, true);
        d.writeUint32(x);
        d.writeUint32(f ? f.byteLength : 0);
        d.writeUint32(e);
        d.writeUint32(0);
        if (f) {
            d.writeBytes(f);
        }
        this.wlanEvent(t, 0);
    }

    handleControl(x: BufferReader) {
        let e = x.readUint32();
        x.readUint16();
        x.readUint16();
        let f = x.readUint32();
        x.readUint32();
        console.log(`[Cyw43Emulator] handleControl IOCTL: cmd=${e}, len=${f}`);
        switch (e) {
            case 2:
            case 20:
            case 22:
            case 64:
            case 86:
            case 110:
            case 134:
            case 142:
            case 165:
                this.ioctlResult(e, f);
                break;
            case 26: {
                let t = x.readUint32();
                x.readChars(t);
                this.ioctlResult(e, f);
                this.asyncEvent(87, 0, 0, 0);
                this.asyncEvent(3, 0, 0, 0);
                this.asyncEvent(88, 0, 0, 0);
                this.asyncEvent(7, 0, 0, 0);
                this.asyncEvent(16, 1, 0, 0);
                this.asyncEvent(1, 0, 0, 0);
                this.asyncEvent(0, 0, 0, 0);
                this.asyncEvent(46, 0, 6, 0);
                break;
            }
            case 52:
                this.ioctlResult(e, f);
                this.asyncEvent(11, 0, 0, 0);
                this.asyncEvent(16, 0, 0, 0);
                break;
            case 262: {
                let t = x.readNullTerminated();
                let d = this.vars[t];
                console.log(`[Cyw43Emulator] IOCTL 262 (WLC_GET_VAR): '${t}'`);
                this.ioctlResult(e, f, d);
                break;
            }
            case 263: {
                let t = x.readNullTerminated();
                let d = x.readBytes(x.remaining);
                console.log(`[Cyw43Emulator] IOCTL 263 (WLC_SET_VAR): '${t}' with ${d.length} bytes`);
                this.vars[t] = d;
                this.ioctlResult(e, f);
                if (t === "gpioout") {
                    let xr = new BufferReader(d);
                    let e_gpio = xr.readUint32();
                    let f_gpio = xr.readUint32();
                    this.gpioValue = (this.gpioValue & ~e_gpio) | (f_gpio & e_gpio);
                    this.onGPIOUpdated(this.gpioValue);
                }
                if (t === "escan") {
                    this.scanResponse({
                        bssid: [66, 19, 55, 85, 170, 1],
                        ssid: "Wokwi-GUEST",
                        channel: 6,
                        rssi: -87
                    });
                    this.asyncEvent(69, 0, 0, 0);
                }
                break;
            }
            case 268: {
                let t = x.readUint16();
                x.readUint16();
                x.readChars(t);
                this.ioctlResult(e, f);
                
                // FIX: Wokwi's mock-picow only fired these on WLC_SET_KEY (cmd=26).
                // We must fire them on WLC_SET_SSID (cmd=268) as well to support OPEN networks!
                this.asyncEvent(87, 0, 0, 0);
                this.asyncEvent(3, 0, 0, 0);
                this.asyncEvent(88, 0, 0, 0);
                this.asyncEvent(7, 0, 0, 0);
                this.asyncEvent(16, 1, 0, 0); // CYW43_EV_LINK_STATUS (1 = Link Up!)
                this.asyncEvent(1, 0, 0, 0);
                this.asyncEvent(0, 0, 0, 0);
                this.asyncEvent(46, 0, 6, 0);
                break;
            }
            default:
                console.warn(`[Cyw43Emulator] unsupported IOCTL: ${e}`);
        }
    }

    wlanRead(x: number, e: Uint32Array) {
        let f = this.events[0];
        if (f) {
            console.log(`[Cyw43Emulator] wlanRead: requested ${e.length * 4} bytes. Event has ${f.byteLength} bytes left.`);
            try {
                // Calculate how many 32-bit words we can copy
                let wordsToCopy = Math.min(e.length, f.byteLength / 4);
                let src = new Uint32Array(f.buffer, f.byteOffset, wordsToCopy);
                e.set(src);
                
                // Check if we consumed the whole event
                if (wordsToCopy * 4 >= f.byteLength) {
                    this.events.shift(); // fully consumed
                    if (this.events.length === 0) {
                        this.int &= ~32; // Clear F2_INT_VALUE
                    }
                } else {
                    // Update the event to keep the remaining bytes for the next read
                    this.events[0] = new Uint8Array(f.buffer, f.byteOffset + wordsToCopy * 4, f.byteLength - wordsToCopy * 4);
                }
            } catch (err: any) {
                console.error(`[Cyw43Emulator] wlanRead crashed: ${err.message}`, err);
            }
        } else {
            console.warn("[Cyw43Emulator] wlanRead: no data available");
        }
        this.updateInterrupts();
    }

    wlanWrite(x: number, e: Uint32Array) {
        console.log(`[Cyw43Emulator] wlanWrite called with buffer size: ${e.buffer.byteLength}, e.length: ${e.length}, x: ${x}`);
        try {
            let f = new BufferReader(new Uint8Array(e.buffer));
            let t = f.readUint16();
            let d = f.readUint16();
            if (t !== ((~d) & 65535)) {
                console.warn("[Cyw43Emulator] wlanWrite: Invalid length", t, d);
                return;
            }
            f.readUint8();
            let a = f.readUint8();
            f.readUint8();
            f.readUint8();
            f.readUint8();
            f.readUint8();
            f.readUint16();
            switch (a) {
                case 0:
                    console.log(`[Cyw43Emulator] wlanWrite: control packet received`);
                    this.handleControl(f);
                    break;
                case 2:
                    console.log(`[Cyw43Emulator] wlanWrite: data packet (ethernet) received`);
                    f.skip(6);
                    // Extract exactly the Ethernet packet
                    this.onPacketTx(f.readBytes(f.remaining));
                    break;
                default:
                    console.warn("[Cyw43Emulator] wlanWrite: unknown channel", a);
            }
        } catch (err: any) {
            console.error(`[Cyw43Emulator] wlanWrite crashed: ${err.message}`, err);
        }
    }

    transformValue(x: number) {
        if (this.ctrl & 1) return x;
        return (((x & 0xff000000) >>> 8) |
                ((x & 0x00ff0000) << 8) |
                ((x & 0x0000ff00) >>> 8) |
                ((x & 0x000000ff) << 8)) >>> 0;
    }

    executeCommand() {
        if (this.cmd && this.buf) {
            if (this.cmd.fn === 3) {
                console.warn("[Cyw43Emulator] Invalid function:", this.cmd);
                return;
            }
            if (this.cmd.write) {
                switch (this.cmd.fn) {
                    case 0:
                        this.busWrite(this.cmd.addr, this.buf);
                        break;
                    case 1:
                        this.bpWrite(this.cmd.addr, this.buf);
                        break;
                    case 2:
                        this.wlanWrite(this.cmd.addr, this.buf);
                        return;
                }
            } else {
                switch (this.cmd.fn) {
                    case 0:
                        this.busRead(this.cmd.addr, this.buf);
                        break;
                    case 1:
                        this.backplaneRead = true;
                        this.bpRead(this.cmd.addr, this.buf);
                        break;
                    case 2:
                        this.wlanRead(this.cmd.addr, this.buf);
                        break;
                }
            }
        }
    }

    writeUint32(x: number) {
        x = this.transformValue(x);
        if (this.cmd) {
            if (this.cmd.write && this.buf && this.bufIndex < this.buf.length) {
                this.buf[this.bufIndex++] = x;
            }
        } else {
            let e = x;
            this.cmd = {
                write: (e & -2147483648) !== 0,
                inc: (e & 1073741824) !== 0,
                fn: (e & 805306368) >>> 28,
                addr: (e & 268433408) >>> 11,
                sz: e & 2047
            };
            console.log(`[Cyw43Emulator] SPI Command: write=${this.cmd.write}, fn=${this.cmd.fn}, addr=${this.cmd.addr}, sz=${this.cmd.sz}`);
            this.buf = new Uint32Array((this.cmd.sz + 3) >> 2);
            this.bufIndex = 0;
            this.backplaneRead = false;
        }
        if (this.cmd && this.buf && (!this.cmd.write || this.bufIndex >= this.buf.length)) {
            this.executeCommand();
            this.cmd = null;
        }
    }

    readUint32() {
        if (this.buf && this.bufIndex < this.buf.length) {
            let x = this.bufIndex;
            if (!this.backplaneRead) {
                this.bufIndex++;
            }
            return this.transformValue(this.buf[x]);
        }
        return 0;
    }

    setSelected(selected: boolean) {
        if (!selected) {
            this.cmd = null;
        }
    }

    get irq() {
        return (this.int & this.intEnable) !== 0;
    }
}
