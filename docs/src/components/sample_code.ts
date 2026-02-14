
import { Config, Query, Lab, Listen, Event, State } from "arkcells"
import { type } from "arktype"

// Hover your mouse to see types

const MyDna = Lab.sequence({
  getData: Query("string", "number"),
  version: Config("string"),
  onUpdate: Event("number"),
  status: State("string = 'idle'")
})

const cell = Lab.clone(MyDna, {
  async getData(id) { return id.length },
  onUpdate(val) { console.log("Update received:", val) },
  status(val) { console.log("Status changed to", val) }
}, { version: "1.2.3", status: "active" })

const imago = cell.genesis()

imago.observe("status", (val) => {
  console.log("Observer received status:", val)
})

imago.api.getData("what?")
imago.api.status("working")
const version = imago.api.version()