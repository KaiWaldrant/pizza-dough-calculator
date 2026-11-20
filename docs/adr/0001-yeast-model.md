# Suggested yeast comes from a power-law fit to Craig's yeast table

To suggest a yeast percentage from fermentation time and temperature, we use a closed-form fit to TXCraig1's "Baker's yeast quantity prediction model" table (pizzamaking.com, topic 26831), the de-facto reference among pizza calculators. The AVPN rules only give a range, not a model, and the formulas on other calculator websites have no stated source and disagree with each other.

- Temperature factor: `r(T) = e^(0.15 · (T − 21))`, with T in °C
- Equivalent hours: `h = Σ hoursᵢ · r(Tᵢ)` across fermentation stages (v1 has exactly one stage)
- Fresh yeast % = `0.2 · (11 / h)^1.37`
- Instant dry = fresh ÷ 3; active dry = instant dry × 1.25

Spot checks against the table: 24 h at 21 °C → 0.069% (table about 0.07%); 48 h at 4 °C → 0.87% (table about 0.9%).

## Considered Options

- **Interpolating the full table:** more faithful, but means bundling a table we only have as a secondhand transcription (github.com/tysonjf/weatherApp `src/engine/craigTable.ts`).
- **A Q10 = 2 exponential model** (used by some calculators): rejected because it makes fridge fermentation about 4× too fast compared with Craig's data.

## Consequences

- The model is only trusted for about 2–100 h and 2–30 °C. Outside that range the app still suggests a value but shows a warning.
- It assumes a Neapolitan-style dough (about 60–65% hydration, about 3% salt). It uses dough temperature, which lags behind fridge air temperature. The fresh-to-dry conversion is about ±15% uncertain. This is why the baker can override the suggested yeast.
- The model takes a list of stages, so a later cold-retard feature only changes the UI.
