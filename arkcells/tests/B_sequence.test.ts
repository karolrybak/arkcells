import { describe, expect, it } from "bun:test"
import { scope, type } from "arktype"
import { Config, Event, Lab, Query, State } from "../src"
import { AminoTypes } from "../src/internal"

describe("B. Lab.sequence", () => {
	it("B1. Accepts plain object with Config and returns sequenced DNA", () => {
		const contract = { version: Config("string") } as const
		const _tm = type.module(contract)
		const dna = Lab.sequence(contract)
		dna.version
		expect(typeof dna.version.type).toBe(typeof AminoTypes.Config)
	})
	it("B2. Accepts pre-sequenced module (arkKind = 'module')", () => {
		const mod = type.module({ version: Config("unknown.any") })
		const dna = Lab.sequence(mod)
		expect(typeof dna.version.type as string).toBe(typeof AminoTypes.Config)
	})
	it("B3. Can sequence dna from any source", () => {
		const ctr = {
			config: Config("string"),
			event: Event("string"),
			lob: State("boolean = false"),
			query: Query("string", "number"),
		} as const

		const sc = scope(ctr)
		const tm = sc.export()

		const dnaCtr = Lab.sequence(ctr)
		const dnaScp = Lab.sequence(sc)
		const dnaMod = Lab.sequence(tm)
		const twiceDnaMod = Lab.sequence(dnaMod)
		const simplify = (d: any) => JSON.parse(JSON.stringify(d, (_k, v) => (v?.expression ? v.expression : v)))
		const expected = simplify(dnaCtr)
		expect(simplify(dnaScp)).toEqual(expected)
		expect(simplify(dnaMod)).toEqual(expected)
		expect(simplify(twiceDnaMod)).toEqual(expected)
		expect(dnaCtr.lob.type).toBe("state")
	})
})
