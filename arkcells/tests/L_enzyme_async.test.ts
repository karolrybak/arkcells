import { describe, expect, it, vi } from "bun:test"
import { Config, Lab, Query } from "../src/index"

describe("L. Query async behavior", () => {
	it("L1-L2. Returns promise and probe receives resolved value", async () => {
		const dna = Lab.sequence({ version: Config("string"), e: Query("number", "number") })
		const cell = Lab.clone<Lab.Mix<typeof dna>>(
			dna,
			{
				async e(n) {
					await new Promise(r => setTimeout(r, 10))
					return n * 2
				},
			},
			{ version: "v.1.0.0" }
		).genesis()

		const p = vi.fn()
		cell.observe("e", async (val: any) => p(await val))

		const promise = cell.api.e(5)
		expect(promise).toBeInstanceOf(Promise)
		const res = await promise
		expect(res).toBe(10)

		await new Promise(r => setTimeout(r, 20))

		expect(p).toHaveBeenCalledWith({ req: 5, res: 10 })
	})
})
