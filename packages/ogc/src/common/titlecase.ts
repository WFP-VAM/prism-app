export default function titlecase(text: string): string {
  return text[0].toUpperCase() + text.substring(1).toLowerCase();
}
