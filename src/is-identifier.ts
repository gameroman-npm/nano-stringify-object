const identifiers = [
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "arguments",
  "eval",
  "globalThis",
  "Infinity",
  "NaN",
  "undefined",
];

const baseRegex = /[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*/u;
const basePattern = `(?<![@#$_\\p{ID_Continue}\\p{ID_Start}])(?!(?:${identifiers.join("|")})(?![$_\\p{ID_Continue}]))${baseRegex.source}`;

const regexExact = new RegExp(`^${basePattern}$`, "u");

export function isIdentifier(value: string): boolean {
  if (value.length > 1e5) return false;
  return regexExact.test(value);
}
