# Decision Records

Lightweight documentation of significant product, architectural, and process choices.

## Purpose

Decision Records (DRs) capture **why** we made important choices, not just **what** we did. They serve as:

- Context for future decisions (avoid repeating analysis)
- Artifacts for AI pairing and team discussions
- Discussion material (reasoning under constraints)

---

## Format

Each record has 3 required sections:

**Context** - Why does this decision matter? (2-4 sentences)  
**Decision** - What are we doing? (1-3 sentences)  
**Consequences** - Benefits and Costs (bullet lists)

See `template.md` for copy-paste template.

---

## When to Write a Decision Record

### ✅ YES - Write a DR

- **Strategic scope decisions:** "Defer undo/redo to post-MVP"
- **Architectural choices:** "Use command pattern for state management"
- **Product trade-offs:** "Prioritize interest-based over friend-based grouping"
- **Process decisions:** "Timebox spikes to 3 hours"

**Trigger phrase:** _"We could do X or Y, and I'm picking X because..."_

### ❌ NO - Don't write a DR

- **Implementation details:** Variable names, file structure, CSS choices
- **Obvious best practices:** "Use TypeScript strict mode"
- **Experimental findings:** That's a spike log (see `/docs/spikes/`)
- **Personal learning:** That's a journal entry (see `/docs/journal/`)

**Trigger phrase:** _"This is the only reasonable way to do it"_

### 🤔 Borderline Cases

| Situation                                       | Write DR? | Why                                          |
| ----------------------------------------------- | --------- | -------------------------------------------- |
| Chose library after testing                     | No        | That's a spike log result                    |
| Chose library without testing                   | Yes       | Strategic choice, document reasoning         |
| Performance optimization (clear win)            | No        | Obvious improvement, no trade-off            |
| Performance optimization (complexity trade-off) | Yes       | Speed vs maintainability is a real trade-off |
| Decided to learn a new pattern                  | No        | Personal learning, use journal               |
| Decided to use a new pattern in project         | Yes       | Architectural choice with consequences       |

---

## Quality Rubric

A good Decision Record:

| Criterion              | What Good Looks Like                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| **1. Skimmable**       | Can extract decision in 30 seconds by reading title + Decision section       |
| **2. Shows reasoning** | Context explains why it matters; Consequences show you considered trade-offs |
| **3. Specific**        | Uses concrete details (numbers, names, constraints), not generic statements  |
| **4. Takes ≤10 min**   | If longer, either overthinking or decision needs a spike first               |
| **5. Follows naming**  | `YYYY-MM-DD-lowercase-with-hyphens.md` for sorting                           |

### Red Flags (Bad Decision Record)

❌ Vague context: "We needed to decide about undo"  
❌ Missing consequences: Just decision, no benefits/costs  
❌ Only benefits listed: Didn't think about downsides  
❌ Took 30+ minutes: Too detailed, not lightweight  
❌ Reads like meeting notes: Stream-of-consciousness writing

---

## Naming Convention

**Format:** `YYYY-MM-DD-lowercase-title-with-hyphens.md`

**Good names:**

- `2025-01-20-defer-command-pattern.md`
- `2025-01-22-use-annealing-algorithm-first.md`
- `2025-01-25-mobile-out-of-scope-for-mvp.md`

**Bad names:**

- `decision.md` (not searchable)
- `CommandPattern.md` (no date, wrong case)
- `01-20-defer-undo.md` (year missing, not sortable)
- `2025-01-20_defer_command.md` (underscores, not hyphens)

**Why this matters:** Files sort chronologically in file explorers. Easy to find "that decision we made in January."

---

## File Organization

```
/docs/decisions/
  README.md (this file)
  template.md (blank template)
  2025-01-20-defer-command-pattern.md
  2025-01-22-annealing-algorithm-first.md
  2025-01-25-mobile-out-of-scope.md
```

Archive old decisions after 3 months to keep folder scannable:

```
/docs/archive/decisions-2025-q1/
  [old decision files]
```

---

## Writing Tips

### Time Budget

- **Context:** 2-3 minutes (describe situation)
- **Decision:** 1-2 minutes (state choice clearly)
- **Consequences:** 4-5 minutes (brainstorm benefits and costs)
- **Total:** 7-10 minutes

If taking longer, you're either overthinking or need to run a spike first.

### How to Write Benefits

Focus on what this **enables, improves, or de-risks:**

- "Saves X hours of implementation time"
- "Allows us to validate Y with users sooner"
- "Keeps codebase simpler during Z phase"
- "Retires risk of X failing late"

### How to Write Costs

Be honest about what you **give up, defer, or constrain:**

- "Users lose X capability"
- "Creates Y hours of future work"
- "Limits us to Z approach"
- "May receive negative feedback on missing X"

### Common Mistakes

1. **Writing a novel** - Keep it to 150-300 words total
2. **Hiding costs** - Every decision has trade-offs; list them
3. **Being generic** - Use your project's actual constraints and numbers
4. **Explaining implementation** - Focus on _why_, not _how_ (that's in code)

---

## Maximum Frequency

**Write 1-2 Decision Records per week maximum.**

If writing more, you're either:

- Overthinking (combine related decisions)
- Documenting implementation (stop, that's what code comments are for)
- Making too many strategic pivots (might need a spike to reduce uncertainty)

Decision Records are for _strategic choices_, not daily work.

---

## Related Documentation

- **Spike Logs** (`/docs/spikes/`) - Technical experiments with time-boxed results
- **Engineering Journal** (`/docs/journal/`) - Personal learning and reflections
- **Roadmap** (`roadmap.md`) - NOW/NEXT/LATER priorities

**Rule of thumb:**

- Spike Log → "We tested X and Y; X works better"
- Decision Record → "We're choosing X over Y because [strategic reasons]"
- Journal → "I learned about X; struggled with Y; next time I'll try Z"
