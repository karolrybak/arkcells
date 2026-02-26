import type { Type } from "arktype"
import type { Default } from "arktype/internal/attributes.ts"

export const AminoTypes = {
	Config: "config",
	Query: "query",
	Event: "event",
	Listen: "listen",
	State: "state",
} as const

type UnwrapDefault<T> = T extends Default<infer Base, any> ? Base : T

export type ConfigShape<I = any> = { type: typeof AminoTypes.Config; req: I }
export type EventShape<I = any> = { type: typeof AminoTypes.Event; req: I }
export type ListenShape<I = any> = { type: typeof AminoTypes.Listen; req: I }
export type StateShape<I = any, D = any> = { type: typeof AminoTypes.State; req: I; def: D }
export type QueryShape<I = any, O = any> = { type: typeof AminoTypes.Query; req: I; res: O }

export type Amino = ConfigShape<any> | EventShape<any> | ListenShape<any> | StateShape<any> | QueryShape<any, any>

export type TypedAmino =
	| Type<ConfigShape<any>, any>
	| Type<EventShape<any>, any>
	| Type<ListenShape<any>, any>
	| Type<StateShape<any>, any>
	| Type<QueryShape<any, any>, any>

export type AminoKind = Amino["type"]

export type InferReq<A> = A extends { req: infer R }
	? R extends { t: infer I }
		? UnwrapDefault<I>
		: R extends { infer: infer I }
			? UnwrapDefault<I>
			: UnwrapDefault<R>
	: never
export type InferRes<A> = A extends { res: Type<any> } ? A["res"]["infer"] : never
export type Infer<Def> = Type<Def>["infer"]

export type IsAny<T> = 0 extends 1 & T ? true : false
export type SpreadArgs<T> = IsAny<T> extends true ? [T] : [T] extends [readonly any[]] ? T : [T]

export type Dna<T extends Record<string, Amino> = Record<string, Amino>> = T
export type DnaMap<T extends Record<string, Dna> = Record<string, Dna>> = T
export type Genome<N extends Dna = any, E extends DnaMap = any, H extends Dna | undefined = any> = { nuclei: N; endo: E; host: H }

export type PickByKind<R extends Dna, K extends AminoKind> = {
	[P in keyof R as R[P]["type"] extends K ? P : never]: R[P]
}

export type KeysByKind<R extends Dna, K extends AminoKind> = Extract<{ [P in keyof R]: R[P]["type"] extends K ? P : never }[keyof R], string>

export type Entries<T extends object> = { [K in keyof T]-?: [K, T[K]] }[keyof T][]

export const entriesOf = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>
