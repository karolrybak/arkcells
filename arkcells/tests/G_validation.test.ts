import { describe, expect, it } from "bun:test"
import { type } from "arktype"
import { Config, Event, Lab, State } from "../src/index"

describe("G. Validation (ArkType)", () => {
	it("G1-G4. Runtime enforcement", () => {
		const dna = Lab.sequence({ version: Config("string"), t: State("number = 1"), s: Event("string") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, { t() {}, s() {} }, { version: "1", t: 1 }).genesis()

		const r1 = cell.api.t("wrong" as any)
		expect(r1).toBeInstanceOf(type.errors)
		const r2 = cell.api.s(123 as any)
		expect(r2).toBeInstanceOf(type.errors)
	})
	it("G5. Config input is validated at construction", () => {
		const dna = Lab.sequence({ version: Config("string") })
		expect(() => {
			Lab.clone<Lab.Mix<typeof dna>>(dna, () => ({}), { version: 123 as any })
		}).toThrow()
	})
})
