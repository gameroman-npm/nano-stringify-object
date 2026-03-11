const RESERVED_WORDS = new Set([
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
]);

const IDENTIFIER_STRUCTURE =
  /^[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}]*$/u;

export function isIdentifier(value: string): boolean {
  if (value.length === 0 || value.length > 1e5) return false;

  if (RESERVED_WORDS.has(value)) return false;

  return IDENTIFIER_STRUCTURE.test(value);
}
