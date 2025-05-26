export function parseDjangoModels(text: string): string[] {
  const regex = /class\s+(\w+)\s*\(\s*models\.Model\s*\)/g;
  const matches = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}
