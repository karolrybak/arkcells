import { type } from "arktype"
import {
	type Amino,
	type AminoKind,
	AminoTypes,
	type ConfigShape,
	type Dna,
	type DnaMap,
	type EventShape,
	entriesOf,
	type Genome,
	type Infer,
	type InferReq,
	type ListenShape,
	type PickByKind,
	type QueryShape,
	type StateShape,
} from "./dna"
import { Inhibited, panic } from "./error"

type Config = typeof AminoTypes.Config
type Event = typeof AminoTypes.Event
type State = typeof AminoTypes.State
type Query = typeof AminoTypes.Query

export type CisternAminos = Config | State
export const CisternAminos = [AminoTypes.Config, AminoTypes.State] as const
export type TransportableAminos = Config | Event | State | Query
export const TransportableAminos = [AminoTypes.Config, AminoTypes.Event, AminoTypes.State, AminoTypes.Query] as const
export type ObservableAminos = State | Event | Query
export const ObservableAminos = [AminoTypes.State, AminoTypes.Event, AminoTypes.Query] as const

export type TransportEvent =
	| { type: "cell:set"; cellId: string; actionId: string; locus: string; value: unknown; timestamp: number }
	| { type: "cell:update"; cellId: string; actionId: string; locus: string; prev: unknown; next: unknown; value: unknown; timestamp: number }
	| { type: "cell:compute:start"; cellId: string; actionId: string; locus: string; timestamp: number }
	| { type: "cell:compute:end"; cellId: string; actionId: string; locus: string; value: unknown; timestamp: number }
	| { type: "cell:event"; cellId: string; actionId: string; locus: string; value: unknown; timestamp: number }
	| { type: "cell:listen"; cellId: string; actionId: string; locus: string; value: unknown; timestamp: number }

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never

type Observer = (event: TransportEvent) => void

export type Transport<A extends Record<string, Amino>> = {
	[K in keyof A]: A[K] extends QueryShape<infer I, infer O>
		? (req: Infer<I>) => Promise<Infer<O>>
		: A[K] extends EventShape<infer I>
			? (req: Infer<I>) => void
			: A[K] extends ConfigShape<infer I>
				? Infer<I>
				: A[K] extends StateShape<infer I>
					? Infer<I>
					: never
}
export type Api<A extends Record<string, Amino>> = {
	[K in keyof A]: A[K] extends QueryShape<infer I, infer O>
		? (req: Infer<I>) => Promise<Infer<O> | type.errors>
		: A[K] extends EventShape<infer I>
			? (req: Infer<I>) => undefined | type.errors
			: A[K] extends ConfigShape<infer I>
				? () => Infer<I>
				: A[K] extends StateShape<infer I>
					? { (val: Infer<I>): undefined | type.errors; (): Infer<I> }
					: never
}

export type Membrane<D extends Dna> = Api<PickByKind<D, Query | Event | Config | State>>
export type HostTransport<D extends Dna> = Transport<PickByKind<D, Config | Event>>
export type EndoTransport<D extends Dna> = Transport<PickByKind<D, Query>>

export type Flora<G extends Genome> = {
	nuclei: Transport<PickByKind<G["nuclei"], TransportableAminos>>
	endo: G["endo"] extends DnaMap ? { [K in keyof G["endo"]]: EndoTransport<G["endo"][K]> } : never
	host: G["host"] extends Dna ? HostTransport<G["host"]> : never
}

export type Integron<D extends Dna> = {
	[K in keyof D as D[K] extends QueryShape | EventShape | ListenShape | StateShape ? K : never]: D[K] extends QueryShape<infer I, infer O>
		? (req: Infer<I>) => Promise<Infer<O>>
		: D[K] extends EventShape<infer I>
			? (req: Infer<I>) => void
			: D[K] extends ListenShape<infer I>
				? (req: Infer<I>) => void
				: D[K] extends StateShape<infer I>
					? (val: Infer<I>) => void
					: never
}

export type Nexus<G extends Genome> = Integron<G["nuclei"]> & ThisType<Flora<G>>

export type Probe<A> =
	A extends StateShape<infer I>
		? (arg: { prev: Infer<I>; next: Infer<I> }) => void
		: A extends EventShape<infer I>
			? (arg: Infer<I>) => void
			: A extends QueryShape<infer I, infer O>
				? (arg: { req: Infer<I>; res: Infer<O> }) => void
				: never
export type Probes<D extends Dna> = { [K in keyof PickByKind<D, ObservableAminos>]?: Probe<D[K]>[] }

export type Inhibitor<A> =
	A extends StateShape<infer I>
		? (arg: { prev: Infer<I>; next: Infer<I> }) => boolean
		: A extends EventShape<infer I>
			? (arg: Infer<I>) => boolean
			: A extends QueryShape<infer I, infer _O>
				? (arg: { req: Infer<I> }) => boolean
				: never

export type Inhibitors<D extends Dna> = { [K in keyof PickByKind<D, ObservableAminos>]?: Inhibitor<D[K]>[] }

export type CisternInput<D extends Dna> = { [K in keyof D as D[K]["type"] extends Config ? K : never]: InferReq<D[K]> } & {
	[K in keyof D as D[K]["type"] extends State ? K : never]?: InferReq<D[K]>
}

export type CisternStorage<D extends Dna> = {
	[K in keyof D as D[K]["type"] extends CisternAminos ? K : never]-?: InferReq<D[K]>
}

class Cistern<D extends Dna> {
	private storage = Object.create(null) as CisternStorage<D>
	constructor(
		public readonly dna: D,
		input: CisternInput<D>
	) {
		for (const [loci, amino] of entriesOf(dna)) {
			if (!CisternAminos.includes(amino.type as any)) continue
			const sKey = loci as keyof CisternStorage<D>
			const iKey = loci as keyof CisternInput<D>

			if (amino.type === AminoTypes.Config) {
				const raw = input[iKey]
				if (raw === undefined) panic(`Missing required config: ${String(loci)}`)
				this.storage[sKey] = amino.req.assert(raw)
			} else {
				const raw = (input as any)[loci]
				if (raw !== undefined) {
					this.storage[sKey] = amino.req.assert(raw)
				} else {
					this.storage[sKey] = (amino as StateShape).def
				}
			}
		}
	}

	get<K extends keyof CisternStorage<D>>(k: K) {
		return this.storage[k]
	}

	setState<K extends keyof CisternStorage<D>>(k: K, val: any) {
		if (this.dna[k]?.type === AminoTypes.State) this.storage[k] = val
	}

	extractType(type: typeof AminoTypes.Config | typeof AminoTypes.State) {
		const res: any = {}
		for (const [key, amino] of entriesOf(this.dna)) {
			if (amino.type === type) res[key] = this.storage[key as keyof CisternStorage<D>]
		}
		return res
	}
	config(): PickByKind<D, Config> {
		return this.extractType(AminoTypes.Config)
	}
	state(): PickByKind<D, State> {
		return this.extractType(AminoTypes.State)
	}
}

export type Mature<D extends Dna, G extends Genome> = [G["host"]] extends [never] ? Embryo<D> : Symbiote<D>

export type Spawn<D extends Dna, G extends Genome> = [G["endo"]] extends [never]
	? [G["host"]] extends [never]
		? Embryo<D>
		: Symbiote<D>
	: Zygote<D, G>

export type Endo<G> = G extends Genome ? { [K in keyof G["endo"]]: Organism<G["endo"][K], any> } : never

export type AbsorbableCells<G> = G extends Genome ? { [K in keyof G["endo"]]: Symbiote<G["endo"][K]> } : never

interface Progenitor {
	name: string
}
interface Zygote<D extends Dna, G extends Genome<D>> extends Progenitor {
	absorb(endo: AbsorbableCells<G>): Mature<D, G>
}

interface Symbiote<D extends Dna> extends Progenitor {
	observe<K extends keyof PickByKind<D, ObservableAminos>>(locus: K, probe: Probe<D[K]>): () => void
	inhibit<K extends keyof PickByKind<D, ObservableAminos>>(locus: K, inhibitor: Inhibitor<D[K]>): () => void
	subscribe(obs: Observer): () => void
}
interface Imago<D extends Dna> extends Symbiote<D> {
	api: Membrane<D>
	trace(actionId: string): Membrane<D>
	apoptosis(): void
}
interface Embryo<D extends Dna> extends Symbiote<D> {
	genesis(): Imago<D>
	alive: boolean
}
interface AbsorbedSymbiote<D extends Dna> extends Symbiote<D> {
	integron: Integron<D>
	apoptosis(): void
}

export class Organism<D extends Dna, G extends Genome> implements Progenitor, Zygote<D, G>, Symbiote<D>, AbsorbedSymbiote<D>, Embryo<D>, Imago<D> {
	public cistern = {} as Cistern<D>
	public integron = {} as Integron<D>
	public api = {} as Membrane<D>
	public transport = {} as Transport<D>
	public flora: Flora<G> | undefined

	public host: Organism<any, any> | undefined
	private endo = {} as Endo<G>

	private probes: Probes<D> = {}
	private inhibitors: Inhibitors<D> = {}
	private observers: Observer[] = []
	public currentActionId: string | null = null

	public alive: boolean = false
	public imago: boolean = false
	public readonly dna: D

	constructor(
		dna: D,
		private nexus: Nexus<G>,
		cisternInput: CisternInput<G["nuclei"]>,
		public name: string = generateShortId()
	) {
		this.name = name
		this.dna = dna
		if (cisternInput) this.cistern = new Cistern(dna, cisternInput as CisternInput<D>)
	}

	public genesis() {
		if (this.alive) panic("Already alive")
		this.transport = this.createTransport()

		var flora: Flora<G> = {
			nuclei: this.transport,
			endo: {} as any,
			host: this.host?.transportForChild() as any,
		}

		for (const [key, child] of entriesOf(this.endo)) {
			child.host = this as any
			child.genesis()
			flora.endo[key] = child.transportForHost() as any
		}

		this.flora = flora

		this.integron = this.bindNexus(this.nexus)
		this.api = this.createMembraneProxy()
		this.alive = true
		if (!this.endo["host"]) this.imago = true
		return this as Imago<D>
	}

	private bindNexus(nexus: Nexus<G>) {
		const boundImplementation: any = {}
		for (const key in nexus) {
			const value = nexus[key]
			if (typeof value === "function") {
				boundImplementation[key] = value.bind(this.flora)
			} else {
				boundImplementation[key] = value
			}
		}
		return boundImplementation
	}

	private createMembraneProxy(): Membrane<D> {
		return new Proxy(this.transport as any, {
			get: (target, prop, _receiver) => {
				if (!this.alive) panic("Api calls only allowed on imago.")

				const amino = this.dna[prop as string]
				if (!amino) return undefined

				if (amino.type === AminoTypes.State || amino.type === AminoTypes.Config) {
					return (...args: any[]) => {
						if (args.length === 0) {
							return this.cistern.get(prop as any)
						}
						if (amino.type === AminoTypes.State) {
							const result = amino.req(args[0])
							if (result instanceof type.errors) return result

							target[prop] = result
							return undefined
						}

						panic(`Config "${String(prop)}" is read-only.`)
					}
				}
				const originalMethod = target[prop]
				if (typeof originalMethod === "function") {
					return (input: unknown) => {
						const result = amino.req(input)
						if (result instanceof type.errors) return result
						return originalMethod(result)
					}
				}
			},
			set: () => {
				panic("Direct assignment to API is not allowed. Use api.property(value) instead.")
			},
		}) as Membrane<D>
	}

	transportForChild(): EndoTransport<D> {
		return this.createTransport([AminoTypes.Config, AminoTypes.Event])
	}

	transportForHost(): HostTransport<D> {
		return this.createTransport([AminoTypes.Query])
	}

	private createTransport(types?: AminoKind[]): Transport<D> {
		const res: any = Object.create(null)

		for (const [key, amino] of entriesOf(this.dna)) {
			if (amino.type === AminoTypes.Listen) continue
			if (types && !types.includes(amino.type)) continue

			const ckey = key as keyof CisternStorage<D>
			const oKey = key as keyof PickByKind<D, ObservableAminos>

			switch (amino.type) {
				case AminoTypes.Config: {
					Object.defineProperty(res, key, {
						enumerable: true,
						configurable: false,
						get: () => this.cistern.get(ckey),
					})
					break
				}
				case AminoTypes.Event: {
					res[key] = (req: unknown) => {
						if (this.isInhibited(oKey, req)) return
						this.emit({ type: "cell:event", locus: key as string, value: req })
						this.integron[key](req)
						this.dispatchEvent(key, req)
						this.notifyProbes(oKey, req)
					}
					break
				}
				case AminoTypes.State: {
					Object.defineProperty(res, key, {
						enumerable: true,
						configurable: false,
						get: () => this.cistern.get(ckey),
						set: (v: unknown) => {
							const prev = this.cistern.get(ckey)
							const next = v

							if (Object.is(prev, next)) return
							if (this.isInhibited(oKey, { prev, next })) return
							this.emit({ type: "cell:update", locus: key as string, prev, next, value: next })
							this.cistern.setState(ckey, next)
							this.integron[key](next)
							this.dispatchEvent(key, { prev, next })
							this.notifyProbes(oKey, { prev, next })
						},
					})
					break
				}
				case AminoTypes.Query: {
					res[key] = async (req: unknown) => {
						if (this.isInhibited(oKey, { req })) throw new Inhibited(`${String(key)}`)
						this.emit({ type: "cell:compute:start", locus: key as string })
						const result = await this.integron[key]?.(req)
						this.notifyProbes(oKey, { req, res: result })
						this.emit({ type: "cell:compute:end", locus: key as string, value: result })

						return result
					}
					break
				}
			}
		}
		return res
	}

	absorb(endo: AbsorbableCells<G>): Mature<D, G> {
		for (const locus in endo) {
			this.endo[locus] = endo[locus] as any
		}
		return this as Mature<D, G>
	}

	public subscribe(obs: Observer) {
		this.observers.push(obs)
		return () => {
			this.observers = this.observers.filter(o => o !== obs)
		}
	}

	public emit(event: TransportEvent | DistributiveOmit<TransportEvent, "cellId" | "actionId" | "timestamp">) {
		var fullEvent: TransportEvent
		if ("cellId" in event) {
			fullEvent = event as TransportEvent
		} else {
			fullEvent = {
				...event,
				cellId: this.name,
				actionId: this.currentActionId ?? "system",
				timestamp: Date.now(),
			} as TransportEvent
		}

		this.observers.forEach(o => o(fullEvent))
		this.host?.emit(fullEvent)
	}

	public trace(actionId: string): Membrane<D> {
		return new Proxy(this.api, {
			get: (target, prop) => {
				const original = target[prop as keyof typeof target]
				if (typeof original !== "function") return original

				return (...args: any[]) => {
					const previousId = this.currentActionId
					this.currentActionId = actionId
					try {
						const result = (original as any)(...args)
						if (result instanceof Promise) {
							return result.finally(() => {
								this.currentActionId = previousId
							})
						}
						return result
					} finally {
						if (!(original instanceof Promise)) {
							this.currentActionId = previousId
						}
					}
				}
			},
		})
	}

	public observe<K extends keyof PickByKind<D, ObservableAminos>>(locus: K, probe: Probe<D[K]>): () => void {
		if (!this.probes[locus]) {
			this.probes[locus] = []
		}
		this.probes[locus]?.push(probe)

		return () => {
			const list = this.probes[locus]
			if (list) {
				const idx = list.indexOf(probe)
				if (idx > -1) list.splice(idx, 1)
			}
		}
	}

	inhibit<K extends keyof PickByKind<D, ObservableAminos>>(locus: K, inhibitor: Inhibitor<D[K]>): () => void {
		if (!this.inhibitors[locus]) {
			this.inhibitors[locus] = []
		}
		this.inhibitors[locus]?.push(inhibitor)

		return () => {
			const list = this.inhibitors[locus]
			if (list) {
				const idx = list.indexOf(inhibitor)
				if (idx > -1) list.splice(idx, 1)
			}
		}
	}

	apoptosis() {
		if (!this.alive) return
		this.alive = false
		for (const k in this.endo) {
			this.endo[k]?.apoptosis()
		}
		this.probes = {}
		this.inhibitors = {}
	}

	private callListen(key: PropertyKey, data: unknown) {
		const handler = this.integron[key as keyof Integron<D>]
		if (handler) {
			this.emit({ type: "cell:listen", locus: key as string, value: data })
			return handler(data)
		}
	}

	public dispatchEvent(key: keyof D, value: unknown) {
		for (const k in this.endo) {
			const child = this.endo[k]
			if (!child) continue
			for (const ck in child.dna) {
				if (ck === key) {
					child.currentActionId = this.currentActionId
					const cAmino = child.dna[ck]
					if (cAmino.type === AminoTypes.Listen) {
						child.callListen(ck, value)
					}
				}
			}
		}
	}

	public notifyProbes(key: keyof PickByKind<D, ObservableAminos>, value: any) {
		const probes = this.probes[key]
		if (!probes) return

		probes.forEach(probe => {
			try {
				probe(value)
			} catch (_error) {
				panic(`Probe error for ${String(key)}:`)
			}
		})
	}

	public isInhibited(key: keyof PickByKind<D, ObservableAminos>, value: any): boolean {
		const list = this.inhibitors[key]
		if (!list) return false
		return list.some(inhibitor => {
			try {
				return inhibitor(value) === true
			} catch (_e) {
				panic(`Inhibitor failed for ${String(key)}`)
			}
		})
	}
}

export const generateShortId = (): string => Math.random().toString(36).substring(2, 11)
