import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

const MsgSyncUpdate = 0x00;
const MsgAwareness = 0x01;
const MsgRequestState = 0x02;

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export class CollabProvider {
  private doc: Y.Doc;
  private awareness: Awareness;
  private ws: WebSocket | null = null;
  private url: string;
  private shouldConnect = true;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 100;
  private maxReconnectDelay = 30000;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private _status: ConnectionStatus = "disconnected";
  private synced = false;

  constructor(url: string, doc: Y.Doc, awareness: Awareness) {
    this.url = url;
    this.doc = doc;
    this.awareness = awareness;

    this.doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);

    this.connect();
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  private connect() {
    if (!this.shouldConnect) return;

    this.setStatus("connecting");

    const ws = new WebSocket(this.url);
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus("connected");
      this.reconnectDelay = 100;

      const msg = new Uint8Array([MsgRequestState]);
      ws.send(msg);
    };

    ws.onmessage = (event: MessageEvent) => {
      const data = new Uint8Array(event.data as ArrayBuffer);
      if (data.length === 0) return;

      const msgType = data[0];
      const payload = data.slice(1);

      switch (msgType) {
        case MsgSyncUpdate:
        case 0x03: // MsgFullState
          Y.applyUpdate(this.doc, payload, this);
          if (msgType === 0x03 && !this.synced) {
            this.synced = true;
          }
          break;

        case MsgAwareness:
          this.applyAwarenessUpdate(payload);
          break;
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.setStatus("disconnected");
      this.synced = false;

      if (this.shouldConnect) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectDelay = Math.min(
        this.reconnectDelay * 2,
        this.maxReconnectDelay
      );
      this.connect();
    }, this.reconnectDelay);
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return;

    const msg = new Uint8Array(1 + update.length);
    msg[0] = MsgSyncUpdate;
    msg.set(update, 1);

    this.send(msg);
  };

  private onAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const changedClients = added.concat(updated, removed);
    const { encodeAwarenessUpdate } = require("y-protocols/awareness") as typeof import("y-protocols/awareness");
    const encodedUpdate = encodeAwarenessUpdate(
      this.awareness,
      changedClients
    );

    const msg = new Uint8Array(1 + encodedUpdate.length);
    msg[0] = MsgAwareness;
    msg.set(encodedUpdate, 1);

    this.send(msg);
  };

  private applyAwarenessUpdate(payload: Uint8Array) {
    const { applyAwarenessUpdate } = require("y-protocols/awareness") as typeof import("y-protocols/awareness");
    applyAwarenessUpdate(this.awareness, payload, this);
  }

  private send(data: Uint8Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  destroy() {
    this.shouldConnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);

    if (this.ws) {
      this.ws.close();
    }

    this.statusListeners.clear();
  }
}
