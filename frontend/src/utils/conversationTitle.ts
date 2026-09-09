export function conversationTitle(title: string | null | undefined): string {
  if (!title || title === "New conversation" || title === "Nouvelle conversation") {
    return "New conversation";
  }
  return title;
}
