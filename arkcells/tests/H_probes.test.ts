import { describe, expect, it, vi } from "bun:test"
import { Config, Lab, Query, State } from "../src/index"

describe("H. Probes (observe)", () => {
	it("H1. Probe receives {prev, next} on State change", () => {
		const dna = Lab.sequence({ version: Config("string"), t: State("number = 0") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, { t: () => {} }, { version: "1", t: 0 }).genesis()
		const probe = vi.fn()
		cell.observe("t", probe)
		cell.api.t(100)
		expect(probe).toHaveBeenCalledWith({ prev: 0, next: 100 })
	})

	it("H. Config cannot be observed", () => {
		const dna = Lab.sequence({ version: Config("string") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(dna, () => ({}), { version: "1" }).genesis()
		// @ts-expect-error
		cell.observe("version", () => {})
	})

	it("H4. Multiple probes and value reception across aminos", async () => {
		const dna = Lab.sequence({
			version: Config("string"),
			t: State("number = 0"),
			e: Query("number", "number"),
		})
		const cell = Lab.clone<Lab.Mix<typeof dna>>(
			dna,
			{
				t: () => {},
				e: async n => n * 2,
			},
			{ version: "1", t: 0 }
		).genesis()

		const p1 = vi.fn()
		const p2 = vi.fn()
		cell.observe("t", p1)
		cell.observe("t", p2)
		cell.api.t(5)
		expect(p1).toHaveBeenCalledWith({ prev: 0, next: 5 })
		expect(p2).toHaveBeenCalledWith({ prev: 0, next: 5 })

		const p3 = vi.fn()

		cell.observe("e", (v: any) => p3(v))
		await cell.api.e(10)

		await new Promise(r => setTimeout(r, 10))
		expect(p3).toHaveBeenCalledWith({ req: 10, res: 20 })
	})
})
