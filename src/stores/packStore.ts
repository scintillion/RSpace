import { RS1 } from '$lib/RS';
import { writable } from 'svelte/store';

const packStore = writable(new RS1.BufPack());

export { packStore };
