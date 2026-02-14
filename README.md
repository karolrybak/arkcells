# ArkCells

**ArkCells** is a type-safe framework for building modular, composable software organisms powered by **ArkType**.
It turns runtime schemas into fully-typed, validated APIs and enforces strict architectural boundaries inspired by cellular biology.

👉 **Docs & Playground:** [https://3ksoft.org/arkcells](https://3ksoft.org/arkcells)

---

## 📦 Install

```bash
bun add arkcells
# or
npm install arkcells
```

---

## ✨ Features

* Single source of truth for **runtime + static types**
* Automatic dependency wiring and lifecycle management
* Fully validated async queries and reactive state
* External observation and interception (**Probes & Inhibitors**)
* Zero-boilerplate typed APIs derived from schemas
* Built on **ArkType** for high-performance runtime validation
* Handy tracing, obervers and inhibitors

---

## Motivation

Achieving absolute type safety in TypeScript often feels like double-entry bookkeeping. Developers define runtime schemas using libraries like Zod or ArkType, then manually type every function call and dependency to match. This leads to redundant boilerplate, desynchronized contracts, and a brittle architecture that is difficult to scale or refactor.

ArkCells was born to eliminate this friction. By treating the schema as immutable **DNA**, the framework automatically derives strictly typed APIs, manages dependencies, and allows for reactive Eventing. It allows you to build complex, multi-layered systems where the types and the runtime are always in perfect sync and 100% validated — with minimal boilerplate.

---

## The Philosophy

In ArkCells, every component follows a strict evolutionary path:

1. **DNA** → Immutable contract (Schema)
2. **Genome** → Blueprint of dependencies (Symbiosis)
3. **Nexus** → Business logic (Implementation)
4. **Organism** → Living unit that matures through lifecycle stages
   **Zygote → Symbiote → Imago**

---

## What's with all the biological terminology?

I started with the usual “Contract”, “Implementation”, etc., but naming some internals became awkward. The biological metaphor fit surprisingly well — so I embraced it 😄

---

## And what about that type syntax?

ArkCells is built around **ArkType**, so it uses its syntax.
Good news: it’s very similar to TypeScript — the learning curve is small.

---

## I'm a molecular biologist. Is this for me?

Probably not what you need for your lab 🙂
But if you can overlook the playful naming, feel free to try it!

---

## Is there RPC?

RPC is not the main focus. Many established libraries already solve it well.
ArkCells integrates easily with your favorite RPC solution.

---

## Was it vibe coded?

I used LLM's quite a lot, but mostly for research, deep diving into more obscure typescript features etc.
Architecture and actual code are 99% hand written.

---

# 🚀 Quick Start

## 1. Sequence your DNA

Define your contract using molecules and ArkType types.
Use `Lab.sequence` to create your DNA.

```ts
import { Lab, Query, Config, Event, Pheno } from "arkcells"

const sensorContract = {
  id: Config("string"),
  read: Query("any", "number"),
  ping: Event("string"),
  status: State("string = 'off'")
} as const

const sensorDna = Lab.sequence(sensorContract);
```

---

## 2. Define your implementations

TypeScript provides full input/output typing for your handlers.

```ts
const sensorNexus = Lab.clone(sensorDna, ({ self }) => ({
  read: async () => Math.random(),
  ping: (msg) => console.log(`Ping: ${msg}`),
  status: (val) => console.log(`Sensor is now ${val}`),
}))
```

---

## 3. Clone and Evolve

Instantiate the cell and trigger its `genesis` to receive the fully functional API.

```ts
const organism = Lab.clone(sensorDna, sensorNexus, {
  id: "SN-1024",
  status: "ready"
});

const sensor = organism.genesis()

await sensor.api.read()
sensor.api.status = "on"
```

---

## 🧬 Molecule Glossary

| Molecule    | Description                              |
| ------------| ---------------------------------------- |
| **Config**  | Injected constants readable by internals |
| **Query**   | Async logic validated by ArkType         |
| **Event**   | Fire-and-forget events                   |
| **State**   | Mutable reactive state                   |
| **Listen**  | Listens to parent Events                |

---

## 🔬 Instrumentation & Control

### Probes (Observation)

```ts
organism.observe("status", (val) => console.log("Status changed:", val))
organism.observe("read", (result) => console.log("Sensor read complete:", result))
```

### Inhibitors (Interception)

```ts
organism.inhibit("status", () => isSystemLocked())
organism.inhibit("read", (params) => params.force === false)
```

---

## 🌱 Symbiosis & Lifecycle

* **Eventing**: Parent Events automatically trigger matching Child Subscriptions
* **Apoptosis**: `organism.apoptosis()` gracefully shuts down dependencies

---

## 🔗 Dependency Injection (Endo)

Cells can host other cells as internal dependencies.

```ts
const dbDna = Lab.sequence({ db:Config(), query: Query("string", "string") })
const appDna = Lab.sequence({ myApp:Config(), Query("string.url", "string") })

type AppGenome = Lab.Mix<typeof appDna, { database: typeof dbDna }>;
```

---

## Requirements

* TypeScript **^5**
* ArkType **^2.1**

### Dev Requirements

* Bun or Node (modern TS environments)

---

## 🧪 Project Status

ArkCells is an experimental project in active development.
APIs may evolve. Feedback and ideas are very welcome!

---

## 📄 License

MIT

---

## 👋 Author

Created by **Karol Rybak**
Full-stack developer with 15+ years of experience in web and systems development.

If this project looks interesting, feel free to open an issue or start a discussion 🙂
