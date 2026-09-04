// The backend stores an untitled conversation under a fixed sentinel title;
// translate it for display rather than migrating every stored row.
export function conversationTitle(title: string | null | undefined): string {
  if (!title || title === "New conversation") return "Nouvelle conversation";
  return title;
}
