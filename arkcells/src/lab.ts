import { arkKind } from "@ark/schema"
import { type Module, type Scope, type scope, type } from "arktype"
import { type Amino, AminoTypes, type Dna, type DnaMap, type Genome } from "./dna"
import { type CisternInput, type Nexus, Organism, type Spawn } from "./organism"

type DnaInfer<M> = M extends Module<infer T> ? T : never

type AsModule<T> = T extends Scope<infer S extends {}> ? Module<S> : T extends Module ? T : T extends object ? Module<scope.infer<T>> : never

function extractDnaDefinition(mod: Module<any>): Record<string, Amino> {
	const result: Record<string, Amino> = {}

	for (const [key, value] of Object.entries(mod)) {
		const t = value as any
		const typeNode = t.get("type")
		const kind = typeNode.unit ?? typeNode.infer

		if (kind === AminoTypes.Query) {
			result[key] = {
				type: AminoTypes.Query,
				req: t.get("req"),
				res: t.get("res"),
			}
		}
		if (kind === AminoTypes.State) {
			const props = (t as any).props as any[] | undefined
			const reqProp = props?.find(p => p.key === "req")

			result[key] = {
				type: AminoTypes.State,
				req: t.get("req"),
				def: reqProp?.default,
			}
		} else {
			result[key] = {
				type: kind,
				req: t.get("req"),
			} as Amino
		}
	}
	return result
}

function asModule(dnaLike: any): Module<any> {
	if (dnaLike && typeof dnaLike === "object" && arkKind in dnaLike) {
		if ("export" in dnaLike && typeof dnaLike.export === "function") {
			return dnaLike.export()
		}
		return dnaLike as Module<any>
	}
	return type.module(dnaLike)
}

function isMatureDna(dnaLike: any): dnaLike is Record<string, Amino> {
	if (!dnaLike || typeof dnaLike !== "object" || arkKind in dnaLike) return false
	const values = Object.values(dnaLike)
	if (values.length === 0) return false
	const first = values[0] as any
	return first && typeof first === "object" && "type" in first && "req" in first && typeof first.req === "function" && arkKind in first.req
}

export type AsGenome<T> = T extends Genome ? T : T extends Dna ? Genome<T, never, never> : never

export const Lab = {
	clone: <T extends Dna | Genome, G extends Genome = AsGenome<T>>(
		dna: T extends Genome ? T["nuclei"] : T,
		nexus: Nexus<G>,
		cisternInput: CisternInput<G["nuclei"]>,
		id?: string
	) => {
		return new Organism(dna, nexus, cisternInput, id) as unknown as Spawn<G["nuclei"], G>
	},

	sequence<T>(dnaLike: T): Lab.Sequencer<T> {
		let result: Record<string, Amino>
		if (isMatureDna(dnaLike)) {
			result = dnaLike
		} else {
			const mod = asModule(dnaLike)
			result = extractDnaDefinition(mod)
		}

		return result as any
	},
}

export namespace Lab {
	export type Craft<G extends Genome> = Nexus<G>
	export type Sequencer<T> = T extends Dna ? T : DnaInfer<AsModule<T>>

	export type Build<N extends Dna, A extends DnaMap = never, B extends Dna = never> = {
		nuclei: N
		readonly _endo: A
		readonly _host: B
		endo<NewA extends DnaMap>(endo: NewA): Build<N, NewA, B>
		host<NewB extends Dna>(host: NewB): Build<N, A, NewB>
	}

	export type Mix<N extends Dna, A extends DnaMap = never, B extends Dna = never> = Genome<N, A, B>
}
