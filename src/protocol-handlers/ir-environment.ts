import type { IRSignal, IRProtocol } from './ir-protocols';

export interface IRNode {
  id: string;
  x: number;
  y: number;
  supportedProtocols: IRProtocol[];
  /** How wide the IR beam is in degrees (for transmitters). 360 = omnidirectional */
  coneAngle: number;
  /** Maximum transmission range in pixels */
  range: number;
  /** Called when this node receives an IR signal. Returns true if accepted. */
  onIRSignalReceived: (signal: IRSignal, senderId: string) => boolean;
  /** Pre-computed cos(halfConeAngle) for faster cone checks (internal) */
  _cosHalfCone?: number;
}

export interface IRReceiverInfo {
  id: string;
  x: number;
  y: number;
  distance: number;
  inCone: boolean;
  supportedProtocols: IRProtocol[];
}

export interface IRTransmitterInfo {
  id: string;
  x: number;
  y: number;
  protocol: IRProtocol;
  range: number;
  coneAngle: number;
}

export class IREnvironment {
  private static nodes: Map<string, IRNode> = new Map();

  static register(node: IRNode): void {
    node._cosHalfCone = node.coneAngle >= 360 ? -1 : Math.cos((node.coneAngle / 2) * (Math.PI / 180));
    this.nodes.set(node.id, node);
  }

  static unregister(id: string): void {
    this.nodes.delete(id);
  }

  static updatePosition(id: string, x: number, y: number): void {
    const node = this.nodes.get(id);
    if (node) {
      node.x = x;
      node.y = y;
    }
  }

  static getNode(id: string): IRNode | undefined {
    return this.nodes.get(id);
  }

  static getAllNodes(): IRNode[] {
    return Array.from(this.nodes.values());
  }

  /** Transmit an IR signal from the given sender.
   *  Returns the IDs of all receivers that successfully received the signal. */
  static transmit(senderId: string, signal: IRSignal): string[] {
    const sender = this.nodes.get(senderId);
    if (!sender) return [];

    const delivered: string[] = [];

    for (const [id, node] of this.nodes) {
      if (id === senderId) continue;
      if (!node.supportedProtocols.includes(signal.protocol)) continue;

      const dx = node.x - sender.x;
      const dy = node.y - sender.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > sender.range * sender.range) continue;

      if (!this.isInCone(sender, node.x, node.y, distSq)) continue;

      const accepted = node.onIRSignalReceived(signal, senderId);
      if (accepted) delivered.push(id);
    }

    return delivered;
  }

  /** Get info about all receivers within range of the given sender. */
  static getReceiversInRange(senderId: string): IRReceiverInfo[] {
    const sender = this.nodes.get(senderId);
    if (!sender) return [];

    const results: IRReceiverInfo[] = [];

    for (const [id, node] of this.nodes) {
      if (id === senderId) continue;
      const dx = node.x - sender.x;
      const dy = node.y - sender.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > sender.range * sender.range) continue;

      const distance = Math.sqrt(distSq);
      results.push({
        id,
        x: node.x,
        y: node.y,
        distance,
        inCone: this.isInCone(sender, node.x, node.y, distSq),
        supportedProtocols: node.supportedProtocols,
      });
    }

    return results;
  }

  /** Get info about nearby transmitters for a receiver. */
  static getNearbyTransmitters(receiverId: string): IRTransmitterInfo[] {
    const receiver = this.nodes.get(receiverId);
    if (!receiver) return [];

    const results: IRTransmitterInfo[] = [];

    for (const [id, node] of this.nodes) {
      if (id === receiverId) continue;
      const dx = node.x - receiver.x;
      const dy = node.y - receiver.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > node.range * node.range) continue;
      if (!this.isInCone(node, receiver.x, receiver.y, distSq)) continue;

      const firstProto = node.supportedProtocols.length > 0 ? node.supportedProtocols[0] : 'NEC' as IRProtocol;
      results.push({
        id,
        x: node.x,
        y: node.y,
        protocol: firstProto,
        range: node.range,
        coneAngle: node.coneAngle,
      });
    }

    return results;
  }

  /** Check if target point lies within the sender's cone using dot product.
   *  Faster than atan2: avoids trig, modulo, and multiple comparisons per call.
   *  magSq can be passed from a pre-computed value to avoid double sqrt. */
  static isInCone(sender: IRNode, targetX: number, targetY: number, magSq?: number): boolean {
    if (sender.coneAngle >= 360) return true;

    const dx = targetX - sender.x;
    const dy = targetY - sender.y;
    if (dx === 0 && dy === 0) return true;

    magSq ??= dx * dx + dy * dy;
    const mag = Math.sqrt(magSq);
    const cosAngle = dx / mag;
    return cosAngle >= (sender._cosHalfCone ?? -1);
  }

  /** Clear all nodes (call on simulation reset). */
  static reset(): void {
    this.nodes.clear();
  }
}
