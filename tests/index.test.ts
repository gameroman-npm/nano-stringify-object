import { test, describe, expect } from "bun:test";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

import stringifyObject from "../src/index";

describe("stringifyObject", () => {
  test("stringify an object", () => {
    const object = {
      foo: "bar 'bar'",
      foo2: [
        "foo",
        "bar",
        {
          foo: "bar 'bar'",
        },
      ],
      "foo-foo": "bar",
      "2foo": "bar",
      "@#": "bar",
      $el: "bar",
      _private: "bar",
      number: 1,
      boolean: true,
      date: new Date("2014-01-29T22:41:05.665Z"),
      escapedString: '""',
      null: null,
      undefined: undefined,
      fn: function fn() {},
      regexp: /./,
      NaN: Number.NaN,
      Infinity: Number.POSITIVE_INFINITY,
      newlines: "foo\nbar\r\nbaz",
      [Symbol()]: Symbol(),
      [Symbol("foo")]: Symbol("foo"),
      [Symbol.for("foo")]: Symbol.for("foo"),
    };

    // @ts-expect-error
    object.circular = object;

    const actual = stringifyObject(object, {
      indent: "  ",
      singleQuotes: false,
    });

    expect(actual + "\n").toMatchSnapshot();
    expect(
      stringifyObject(
        { foo: String.raw`a ' b ' c \' d` },
        { singleQuotes: true },
      ),
    ).toBe("{\n\tfoo: 'a \\' b \\' c \\\\\\' d'\n}");
  });

  test("string escaping works properly", () => {
    expect(stringifyObject("\\", { singleQuotes: true })).toBe(
      String.raw`'\\'`,
    ); // \
    expect(stringifyObject(String.raw`\'`, { singleQuotes: true })).toBe(
      String.raw`'\\\''`,
    ); // \'
    expect(stringifyObject(String.raw`\"`, { singleQuotes: true })).toBe(
      String.raw`'\\"'`,
    ); // \"
    expect(stringifyObject("\\", { singleQuotes: false })).toBe(
      String.raw`"\\"`,
    ); // \
    expect(stringifyObject(String.raw`\'`, { singleQuotes: false })).toBe(
      String.raw`"\\'"`,
    ); // \'
    expect(stringifyObject(String.raw`\"`, { singleQuotes: false })).toBe(
      String.raw`"\\\""`,
    ); // \"
    // oxlint-disable-next-line no-eval
    expect(eval(stringifyObject(String.raw`\'`))).toBe(String.raw`\'`);
    // oxlint-disable-next-line no-eval
    expect(eval(stringifyObject(String.raw`\'`, { singleQuotes: false }))).toBe(
      String.raw`\'`,
    );
    expect(stringifyObject("a'a")).toBe(String.raw`'a\'a'`);
  });

  test("detect reused object values as circular reference", () => {
    const value = { val: 10 };
    const object = { foo: value, bar: value };
    expect(stringifyObject(object)).toBe(
      "{\n\tfoo: {\n\t\tval: 10\n\t},\n\tbar: {\n\t\tval: 10\n\t}\n}",
    );
  });

  test("detect reused array values as false circular references", () => {
    const value = [10];
    const object = { foo: value, bar: value };
    expect(stringifyObject(object)).toBe(
      "{\n\tfoo: [\n\t\t10\n\t],\n\tbar: [\n\t\t10\n\t]\n}",
    );
  });

  test("considering filter option to stringify an object", () => {
    const value = { val: 10 };
    const object = { foo: value, bar: value };
    const actual = stringifyObject(object, {
      filter: (_object, prop) => prop !== "foo",
    });
    expect(actual).toBe("{\n\tbar: {\n\t\tval: 10\n\t}\n}");

    const actual2 = stringifyObject(object, {
      filter: (_object, prop) => prop !== "bar",
    });
    expect(actual2).toBe("{\n\tfoo: {\n\t\tval: 10\n\t}\n}");

    const actual3 = stringifyObject(object, {
      filter: (_object, prop) => prop !== "val" && prop !== "bar",
    });
    expect(actual3).toBe("{\n\tfoo: {}\n}");
  });

  test("allows an object to be transformed", () => {
    const object = {
      foo: {
        val: 10,
      },
      bar: 9,
      baz: [8],
    } as const;

    const actual = stringifyObject(object, {
      transform(object, prop, result) {
        if (prop === "val") {
          return String(object[prop] + 1);
        }

        if (prop === "bar") {
          return "'" + result + "L'";
        }

        if (object[prop] === 8) {
          return "LOL";
        }

        return result;
      },
    });

    expect(actual).toBe(
      "{\n\tfoo: {\n\t\tval: 11\n\t},\n\tbar: '9L',\n\tbaz: [\n\t\tLOL\n\t]\n}",
    );
  });

  test("doesn't  crash with circular references in arrays", () => {
    const array: unknown[] = [];
    array.push(array);
    expect(() => {
      stringifyObject(array);
    }).not.toThrow();

    const nestedArray: [unknown[]] = [[]];
    nestedArray[0][0] = nestedArray;
    expect(() => {
      stringifyObject(nestedArray);
    }).not.toThrow();
  });

  test("handle circular references in arrays", () => {
    const array2: unknown[] = [];
    const array = [array2];
    array2[0] = array2;

    expect(() => {
      stringifyObject(array);
    }).not.toThrow();
  });

  test("stringify complex circular arrays", () => {
    const array = [[[]]];
    // @ts-expect-error
    array[0].push(array);
    // @ts-expect-error
    array[0][0].push(array, 10);
    // @ts-expect-error
    array[0][0][0] = array;
    expect(stringifyObject(array)).toBe(
      '[\n\t[\n\t\t[\n\t\t\t"[Circular]",\n\t\t\t10\n\t\t],\n\t\t"[Circular]"\n\t]\n]',
    );
  });

  test("allows short objects to be one-lined", () => {
    const object = { id: 8, name: "Jane" };

    expect(stringifyObject(object)).toBe("{\n\tid: 8,\n\tname: 'Jane'\n}");
    expect(stringifyObject(object, { inlineCharacterLimit: 21 })).toBe(
      "{id: 8, name: 'Jane'}",
    );
    expect(stringifyObject(object, { inlineCharacterLimit: 20 })).toBe(
      "{\n\tid: 8,\n\tname: 'Jane'\n}",
    );
  });

  test("allows short arrays to be one-lined", () => {
    const array = ["foo", { id: 8, name: "Jane" }, 42];

    expect(stringifyObject(array)).toBe(
      "[\n\t'foo',\n\t{\n\t\tid: 8,\n\t\tname: 'Jane'\n\t},\n\t42\n]",
    );
    expect(stringifyObject(array, { inlineCharacterLimit: 34 })).toBe(
      "['foo', {id: 8, name: 'Jane'}, 42]",
    );
    expect(stringifyObject(array, { inlineCharacterLimit: 33 })).toBe(
      "[\n\t'foo',\n\t{id: 8, name: 'Jane'},\n\t42\n]",
    );
  });

  test("does not mess up indents for complex objects", () => {
    const object = {
      arr: [1, 2, 3],
      nested: { hello: "world" },
    };

    expect(stringifyObject(object)).toBe(
      "{\n\tarr: [\n\t\t1,\n\t\t2,\n\t\t3\n\t],\n\tnested: {\n\t\thello: 'world'\n\t}\n}",
    );
    expect(stringifyObject(object, { inlineCharacterLimit: 12 })).toBe(
      "{\n\tarr: [1, 2, 3],\n\tnested: {\n\t\thello: 'world'\n\t}\n}",
    );
  });

  test("handles non-plain object", () => {
    // TODO: It should work without `fileURLToPath` but currently it throws for an unknown reason.
    expect(
      stringifyObject(fs.statSync(fileURLToPath(import.meta.url))),
    ).not.toBe("[object Object]");
  });

  test("don't stringify non-enumerable symbols", () => {
    const object = {
      [Symbol("for enumerable key")]: undefined,
    };
    const symbol = Symbol("for non-enumerable key");
    Object.defineProperty(object, symbol, { enumerable: false });

    expect(stringifyObject(object)).toBe(
      "{\n\t[Symbol('for enumerable key')]: undefined\n}",
    );
  });

  test("handle symbols", () => {
    const object = {
      [Symbol("unique")]: Symbol("unique"),
      [Symbol.for("registry")]: [Symbol.for("registry"), 2],
      [Symbol.iterator]: { k: Symbol.iterator },
      [Symbol()]: "undef", // eslint-disable-line symbol-description
    };
    expect(stringifyObject(object)).toBe(
      "{\n\t[Symbol('unique')]: Symbol('unique'),\n\t[Symbol.for('registry')]: [\n\t\tSymbol.for('registry'),\n\t\t2\n\t],\n\t[Symbol.iterator]: {\n\t\tk: Symbol.iterator\n\t},\n\t[Symbol()]: 'undef'\n}",
    );

    // Anonymous symbol (no description)
    expect(stringifyObject(Symbol())).toBe("Symbol()"); // eslint-disable-line symbol-description

    // Symbol with empty string description
    expect(stringifyObject(Symbol(""))).toBe("Symbol('')");

    // Symbol.for with empty string
    expect(stringifyObject(Symbol.for(""))).toBe("Symbol.for('')");

    // Test as object keys
    const emptySymbolKeys = {
      [Symbol()]: "anonymous", // eslint-disable-line symbol-description
      [Symbol("")]: "empty string",
      [Symbol.for("")]: "empty for",
    };
    expect(stringifyObject(emptySymbolKeys)).toMatch(/\[Symbol\(\)]/);
    expect(stringifyObject(emptySymbolKeys)).toMatch(/\[Symbol\(''\)]/);
    expect(stringifyObject(emptySymbolKeys)).toMatch(/\[Symbol\.for\(''\)]/);

    // Symbol escaping with special characters
    const symbolWithSpecialChars = Symbol('a"b\\c\n');
    expect(stringifyObject(symbolWithSpecialChars)).toBe(
      String.raw`Symbol('a"b\\c\n')`,
    );
    expect(
      stringifyObject(symbolWithSpecialChars, { singleQuotes: false }),
    ).toBe(String.raw`Symbol("a\"b\\c\n")`);

    const specialCharKey = {
      [Symbol('a"b\\c\n')]: "value",
    };
    expect(stringifyObject(specialCharKey)).toMatch(
      /\[Symbol\('a"b\\\\c\\n'\)]/,
    );

    // Well-known symbols
    expect(stringifyObject(Symbol.iterator)).toBe("Symbol.iterator");
    expect(stringifyObject(Symbol.hasInstance)).toBe("Symbol.hasInstance");
    expect(stringifyObject(Symbol.toStringTag)).toBe("Symbol.toStringTag");

    // Look-alike symbols (not real well-known symbols)
    expect(stringifyObject(Symbol("Symbol.iterator"))).toBe(
      "Symbol('Symbol.iterator')",
    );
    expect(stringifyObject(Symbol("Symbol.hasInstance"))).toBe(
      "Symbol('Symbol.hasInstance')",
    );
    expect(stringifyObject(Symbol("Symbol.toStringTag"))).toBe(
      "Symbol('Symbol.toStringTag')",
    );
  });

  test("should properly escape special characters", () => {
    const s = "tab: \t newline: \n backslash: \\";
    expect(stringifyObject(s)).toBe(
      String.raw`'tab: \t newline: \n backslash: \\'`,
    );

    const s2 = "carriage return: \r tab: \t";
    expect(stringifyObject(s2)).toBe(String.raw`'carriage return: \r tab: \t'`);

    // Test other escape sequences
    expect(stringifyObject("\f")).toBe(String.raw`'\f'`); // Form feed
    expect(stringifyObject("\v")).toBe(String.raw`'\v'`); // Vertical tab
    expect(stringifyObject("\b")).toBe(String.raw`'\b'`); // Backspace
    expect(stringifyObject("\0")).toBe(String.raw`'\0'`); // Null character

    // Test control characters that need unicode escape
    expect(stringifyObject(String.fromCodePoint(1))).toBe(String.raw`'\u0001'`); // Start of heading
    expect(stringifyObject(String.fromCodePoint(7))).toBe(String.raw`'\u0007'`); // Bell
    expect(stringifyObject(String.fromCodePoint(27))).toBe(
      String.raw`'\u001b'`,
    ); // Escape
    expect(stringifyObject(String.fromCodePoint(31))).toBe(
      String.raw`'\u001f'`,
    ); // Unit separator
    expect(stringifyObject(String.fromCodePoint(127))).toBe(
      String.raw`'\u007f'`,
    ); // Delete

    // Test a string with multiple special characters
    const mixed = "a\tb\nc\rd\fe\vf\bg\0h" + String.fromCodePoint(1) + "i";
    expect(stringifyObject(mixed)).toBe(
      String.raw`'a\tb\nc\rd\fe\vf\bg\0h\u0001i'`,
    );
  });

  test("handle Map objects", () => {
    // Empty Map
    const emptyMap = new Map();
    expect(stringifyObject(emptyMap)).toBe("new Map()");

    // Map with various types
    const map = new Map<unknown, unknown>([
      ["string", "value"],
      [42, "number key"],
      [true, "boolean key"],
      [null, "null key"],
      [undefined, "undefined key"],
    ]);
    expect(stringifyObject(map)).toBe(
      `new Map([
	['string', 'value'],
	[42, 'number key'],
	[true, 'boolean key'],
	[null, 'null key'],
	[undefined, 'undefined key']
])`,
    );

    // Map with object values
    const objectMap = new Map([
      ["a", { foo: "bar" }],
      ["b", [1, 2, 3]],
    ]);
    expect(stringifyObject(objectMap)).toBe(
      `new Map([
	['a', {
		foo: 'bar'
	}],
	['b', [
		1,
		2,
		3
	]]
])`,
    );

    // Map with symbol keys
    const symbolMap = new Map([
      [Symbol("test"), "symbol key"],
      [Symbol.iterator, "well-known symbol"],
    ]);
    expect(
      stringifyObject(symbolMap),
      `new Map([
	[Symbol('test'), 'symbol key'],
	[Symbol.iterator, 'well-known symbol']
])`,
    );

    // Nested Map
    const nestedMap = new Map([["inner", new Map([["deep", "value"]])]]);
    expect(stringifyObject(nestedMap)).toBe(
      `new Map([
	['inner', new Map([
		['deep', 'value']
	])]
])`,
    );
  });

  test("handle Set objects", () => {
    // Empty Set
    const emptySet = new Set();
    expect(stringifyObject(emptySet)).toBe("new Set()");

    // Set with various types
    const set = new Set(["string", 42, true, null, undefined]);
    expect(stringifyObject(set)).toBe(
      `new Set([
	'string',
	42,
	true,
	null,
	undefined
])`,
    );

    // Set with objects
    const objectSet = new Set([{ foo: "bar" }, [1, 2, 3]]);
    expect(stringifyObject(objectSet)).toBe(
      `new Set([
	{
		foo: 'bar'
	},
	[
		1,
		2,
		3
	]
])`,
    );

    // Nested Set
    const nestedSet = new Set([new Set(["inner"])]);
    expect(stringifyObject(nestedSet)).toBe(
      `new Set([
	new Set([
		'inner'
	])
])`,
    );
  });

  test("handle Map and Set with circular references", () => {
    // Circular Map
    const circularMap = new Map();
    circularMap.set("self", circularMap);
    expect(stringifyObject(circularMap)).toMatch(/\[Circular]/);

    // Circular Set
    const circularSet = new Set();
    circularSet.add(circularSet);
    expect(stringifyObject(circularSet)).toMatch(/\[Circular]/);
  });

  test("handle edge cases", () => {
    // BigInt
    expect(stringifyObject(BigInt(123))).toBe("123n");

    // Invalid Date
    const invalidDate = new Date("invalid");
    expect(stringifyObject(invalidDate)).toBe("new Date('Invalid Date')");

    // Object with numeric keys
    const numericKeys: Record<number, string> = {};
    numericKeys[123] = "numeric";
    numericKeys[456] = "string numeric";
    expect(stringifyObject(numericKeys)).toBe(
      "{\n\t'123': 'numeric',\n\t'456': 'string numeric'\n}",
    );

    // Reserved keywords as keys - quoted for safety
    const reserved: Partial<{ class: string; const: string; return: string }> =
      {};
    reserved.class = "reserved";
    reserved.const = "keyword";
    reserved.return = "statement";
    expect(stringifyObject(reserved)).toBe(
      "{\n\t'class': 'reserved',\n\t'const': 'keyword',\n\t'return': 'statement'\n}",
    );
  });
});
