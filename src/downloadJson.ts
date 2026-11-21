/** Makes the browser download `value` as a JSON file. */
export function downloadJson(fileName: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  // Some browsers cancel the download if the URL is released straight after the click.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
