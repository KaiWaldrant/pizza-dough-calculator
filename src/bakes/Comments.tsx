import { useId, useState } from "react";
import { text } from "../text";
import { useLoad } from "../useLoad";
import type { Comment } from "./bake";
import type { BakeRepository } from "./bakeRepository";

const t = text.bakes;

/** A Bake's comments, oldest first, with a box to add one. Comments are never edited. */
export function Comments({ repository, bakeId }: { repository: BakeRepository; bakeId: string }) {
  const loaded = useLoad(() => repository.listComments(bakeId), [repository, bakeId]);
  // Edits made here are kept apart from the loaded list and applied with functional updates,
  // so neither an add before loading finishes nor quick successive clicks can drop a change.
  const [added, setAdded] = useState<Comment[]>([]);
  const [deletedIds, setDeletedIds] = useState<ReadonlySet<string>>(new Set());
  const comments = [...(loaded ?? []), ...added].filter(({ id }) => !deletedIds.has(id));
  const [body, setBody] = useState("");
  const headingId = useId();
  const fieldId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId}>{t.comments}</h3>
      {comments.length > 0 && (
        <ul aria-labelledby={headingId}>
          {comments.map((comment) => (
            <li key={comment.id}>
              <time dateTime={comment.createdAt}>{t.commentedAt(comment.createdAt)}</time> {comment.body}{" "}
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(t.confirmDeleteComment)) return;
                  await repository.deleteComment(comment.id);
                  setDeletedIds((ids) => new Set(ids).add(comment.id));
                }}
              >
                {t.deleteComment}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const trimmed = body.trim();
          if (trimmed === "") return;
          const comment = await repository.addComment(bakeId, trimmed);
          setAdded((previous) => [...previous, comment]);
          setBody("");
        }}
      >
        <label htmlFor={fieldId}>{t.comment}</label>
        <textarea id={fieldId} value={body} onChange={(event) => setBody(event.target.value)} />
        <button type="submit" disabled={body.trim() === ""}>
          {t.addComment}
        </button>
      </form>
    </section>
  );
}
