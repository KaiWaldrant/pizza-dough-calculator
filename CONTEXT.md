# Pizza Dough

Working out how much of each ingredient goes into a pizza dough, and keeping track of doughs made before.

## Language

### Formula

**Baker's percentage**:
An ingredient's weight given as a percentage of the total flour weight. Flour is always 100%.
_Avoid_: Ratio, proportion

**Ingredient**:
One of the four things that make up a dough: flour, water, salt, yeast. No other ingredients exist in this context.

**Hydration**:
The water's baker's percentage.
_Avoid_: Water ratio, moisture

**Dough ball**:
One portion of dough that becomes one pizza. All dough balls in a dough weigh the same.
_Avoid_: Pizza, portion, pâton

**Ball weight**:
The weight of a single dough ball, in grams.

**Dough weight**:
The combined weight of all ingredients in a dough, in grams.
_Avoid_: Total, batch weight

**Leftover**:
The dough left over after dividing a dough into whole dough balls, in grams.
_Avoid_: Remainder, scrap

**By dough balls**:
Calculating a dough from a number of dough balls and a ball weight; the flour weight follows from them.
_Avoid_: Ball-first, portion mode

**By flour**:
Calculating a dough from a given flour weight; the number of dough balls (if a ball weight is given) follows from it.
_Avoid_: Flour-first, batch mode

### Yeast and fermentation

**Yeast type**:
The form of yeast used: fresh, active dry, or instant dry. The type changes how much yeast is needed for the same fermentation.

**Fermentation**:
The time the dough rises before baking, made of one or more fermentation stages. For now a baker describes it as a single stage.
_Avoid_: Proof, rise, retard

**Fermentation stage**:
One period of fermentation at a steady temperature, described by its duration in hours and its temperature in °C.
_Avoid_: Phase, step

**Suggested yeast**:
The yeast baker's percentage the calculator derives from the fermentation and yeast type.

**Overridden yeast**:
A yeast baker's percentage the baker entered in place of the suggested yeast.

### History

**Bake**:
One dough the baker made: a saved snapshot of its formula, fermentation, yeast type and resulting ingredient weights, plus its comments.
_Avoid_: Attempt, batch, recipe

**Bake date**:
The day the baker made the dough of a bake. It defaults to the day the bake is saved, and the baker can pick another.
_Avoid_: Created date

**Backup**:
One JSON file holding the whole history: every bake and its comments. Exporting downloads one; importing merges one into the history, skipping bakes that already exist.
_Avoid_: Dump, snapshot

**Comment**:
A timestamped note the baker attaches to a bake, e.g. how the dough behaved or how the pizza turned out.
_Avoid_: Note, review
