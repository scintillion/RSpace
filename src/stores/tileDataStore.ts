import { writable, type Writable } from 'svelte/store';
import { RS1 } from '$lib/RS';

export interface TileMessage {
  from: string;
  to: string;
  nug: RS1.Nug;
  timestamp: number;
}

const tileInboxes = new Map<string, Writable<TileMessage | null>>();

function getTileInbox(tileId: string): Writable<TileMessage | null> {
  if (!tileInboxes.has(tileId)) {
    tileInboxes.set(tileId, writable<TileMessage | null>(null));
  }
  return tileInboxes.get(tileId)!;
}

export class tileCommunication {
  
  sendNug(fromTileId: string, toTileId: string, nug: RS1.Nug) {
    const message: TileMessage = {
      from: fromTileId,
      to: toTileId,
      nug: nug,
      timestamp: Date.now()
    };
    
    console.log(`Nug sent from ${fromTileId} to ${toTileId}. Content:`, nug.l.to$);
    
    const tileInbox = getTileInbox(toTileId);
    tileInbox.set(message);
  }
  
  subscribe(tileId: string, callback: (message: TileMessage | null) => void): () => void {
    const tileInbox = getTileInbox(tileId);
    return tileInbox.subscribe(callback);
  }
}

export const tileComm = new tileCommunication(); 