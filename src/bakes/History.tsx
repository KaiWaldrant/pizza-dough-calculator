import { useId, useState } from "react";
import { downloadJson } from "../downloadJson";
import { text } from "../text";
import { today } from "../today";
import { useLoad } from "../useLoad";
import { parseBackup } from "./backup";
import type { BakeRepository } from "./bakeRepository";
import { summarizeBake } from "./summarizeBake";

const t = text.bakes;

export function History({ repository, onOpen }: { repository: BakeRepository; onOpen: (id: string) => void }) {
  /** Changed after an import, so the list loads again. */
  const [reloadKey, setReloadKey] = useState(0);
  const bakes = useLoad(() => repository.list(), [repository, reloadKey]);
  /** The outcome of the last export or import. */
  const [message, setMessage] = useState("");
  const importId = useId();

  async function exportHistory() {
    try {
      downloadJson(t.backupFileName(today()), await repository.exportBackup());
      setMessage("");
    } catch {
      setMessage(t.exportFailed);
    }
  }

  async function importHistory(file: File) {
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        setMessage(parsed.errors[0]?.reason === "unknownSchemaVersion" ? t.otherVersion : t.notABackup);
        return;
      }
      setMessage(t.imported(await repository.importBackup(parsed.backup)));
    } catch {
      setMessage(t.importFailed);
    }
    setReloadKey((key) => key + 1);
  }

  return (
    <section>
      <h2>{text.navigation.history}</h2>
      <p>
        <button type="button" onClick={exportHistory}>
          {t.exportHistory}
        </button>{" "}
        <label htmlFor={importId}>{t.importHistory}</label>{" "}
        <input
          id={importId}
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = ""; // Choosing the same file again still triggers an import.
            if (file) void importHistory(file);
          }}
        />
      </p>
      <p role="status">{message}</p>
      {bakes === undefined ? null : bakes.length === 0 ? (
        <p>{t.noBakes}</p>
      ) : (
        <ul>
          {bakes.map((bake) => (
            <li key={bake.id}>
              <button type="button" onClick={() => onOpen(bake.id)}>
                <time dateTime={bake.bakeDate}>{bake.bakeDate}</time> {summarizeBake(bake)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
