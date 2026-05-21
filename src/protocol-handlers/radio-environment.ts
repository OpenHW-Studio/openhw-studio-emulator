export interface RadioPacket {
    senderId: string;
    frequencyHz: number;
    bandwidthHz: number;
    modulation: string; // e.g., 'GFSK', 'OFDM', 'ASK'
    txPowerDbm: number;
    payload: Uint8Array;
}

export interface RadioNode {
    id: string;
    frequencyHz: number;
    bandwidthHz: number;
    modulation: string;
    magicInterop: boolean; // If true, ignores modulation constraints (for debugging)
    onRadioPacketReceived(packet: RadioPacket, isJammed: boolean): void;
}

export class RadioEnvironment {
    private static nodes: Set<RadioNode> = new Set();
    private static activeTransmissions: { endTime: number, packet: RadioPacket }[] = [];

    static register(node: RadioNode) {
        this.nodes.add(node);
    }

    static unregister(node: RadioNode) {
        this.nodes.delete(node);
    }

    /**
     * Transmits a packet into the environment. 
     * Calculates collisions (jamming) and delivers to listeners.
     */
    static transmit(packet: RadioPacket, durationMs: number = 2) {
        const now = Date.now();

        // Clean up expired transmissions
        this.activeTransmissions = this.activeTransmissions.filter(t => t.endTime > now);

        // Check for active jamming on this frequency range
        let isJammed = false;
        for (const tx of this.activeTransmissions) {
            if (this.isOverlapping(packet, tx.packet)) {
                isJammed = true;
                break;
            }
        }

        // Add this transmission to the active list
        this.activeTransmissions.push({ endTime: now + durationMs, packet });

        // Deliver to overlapping nodes
        for (const node of this.nodes) {
            if (node.id === packet.senderId) continue;

            if (this.nodeOverlaps(node, packet)) {
                // If it's physically overlapping, check modulation or magic interop
                if (node.magicInterop || node.modulation === packet.modulation || node.modulation === 'ANY') {
                    // Node receives it!
                    node.onRadioPacketReceived(packet, isJammed);
                } else {
                    // Node receives it as noise (jamming), could trigger a noisy packet event if desired,
                    // but for now we just drop un-demodulatable packets unless it's magic interop.
                }
            }
        }
    }

    private static isOverlapping(p1: RadioPacket, p2: RadioPacket): boolean {
        const p1Min = p1.frequencyHz - (p1.bandwidthHz / 2);
        const p1Max = p1.frequencyHz + (p1.bandwidthHz / 2);
        const p2Min = p2.frequencyHz - (p2.bandwidthHz / 2);
        const p2Max = p2.frequencyHz + (p2.bandwidthHz / 2);
        return p1Min <= p2Max && p1Max >= p2Min;
    }

    private static nodeOverlaps(node: RadioNode, p: RadioPacket): boolean {
        const nMin = node.frequencyHz - (node.bandwidthHz / 2);
        const nMax = node.frequencyHz + (node.bandwidthHz / 2);
        const pMin = p.frequencyHz - (p.bandwidthHz / 2);
        const pMax = p.frequencyHz + (p.bandwidthHz / 2);
        return nMin <= pMax && nMax >= pMin;
    }
}
