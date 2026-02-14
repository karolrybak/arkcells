import { describe, expect, it } from "bun:test"
import { Event, Lab, Listen } from "../src" // dostosuj ścieżki

describe("M Arkcells Tracing API", () => {
	it("should correlate child events with parent trace id", async () => {
		const capturedEvents: any[] = []

		const childDna = Lab.sequence({ ping: Listen("string") })
		const parentDna = Lab.sequence({ ping: Event("string") })

		type ChildGen = Lab.Mix<typeof childDna>
		type ParentGen = Lab.Mix<typeof parentDna, { myChild: typeof childDna }>

		const childNexus: Lab.Craft<ChildGen> = {
			ping(_msg) {},
		}
		const parentNexus: Lab.Craft<ParentGen> = {
			ping(_msg) {},
		}

		const child = Lab.clone<ChildGen>(childDna, childNexus, {}, "child_cell")
		const parent = Lab.clone<ParentGen>(parentDna, parentNexus, {}, "parent_cell")
		const system = parent.absorb({ myChild: child }).genesis()

		system.subscribe(ev => capturedEvents.push(ev))

		const TRACE_ID = "request-uuid-123"
		system.trace(TRACE_ID).ping("hello")

		expect(capturedEvents.length).toBeGreaterThanOrEqual(2)

		capturedEvents.forEach(ev => {
			expect(ev.actionId).toBe(TRACE_ID)
		})

		const childEvent = capturedEvents.find(ev => ev.cellId === child.name)
		expect(childEvent).toBeDefined()
		expect(childEvent.locus).toBe("ping")
	})
})
