import { Calculator } from "./calculator/Calculator";
import { text } from "./text";

export function App() {
  return (
    <main>
      <h1>{text.appTitle}</h1>
      <Calculator />
    </main>
  );
}
