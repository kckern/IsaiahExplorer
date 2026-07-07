/**
 * @jest-environment jsdom
 *
 * Proves the html-react-parser 0.4 -> v5 migration of the commentary renderer.
 * Tests the real exported `commentaryReplacer` (used by Commentary.js) against
 * real domhandler nodes produced by html-react-parser's own `htmlToDOM`, so we
 * exercise the exact node shape the parser hands the `replace` callback.
 */
import React from "react";
import Parser, { htmlToDOM } from "html-react-parser";
import { render } from "@testing-library/react";
import { commentaryReplacer } from "../commentaryReplacer";

// Lightweight stand-ins for the injected link components. Using distinct
// component identities lets us assert which one the replacer chose.
function SGLink({ reference }) {
  return <span data-sg>{reference}</span>;
}
function CommentaryTagLink({ reference, verses }) {
  return <span data-isa data-verses={JSON.stringify(verses)}>{reference}</span>;
}

// Mock app.verseDatatoArray: turns the decoded verses object into a number[].
const app = {
  verseDatatoArray: (obj) => Object.keys(obj).map(Number),
};

const replace = commentaryReplacer(app, { SGLink, CommentaryTagLink });

// html-react-parser hands the replace callback one node at a time; htmlToDOM
// gives us those exact nodes for a fragment of HTML.
const firstNode = (html) => htmlToDOM(html)[0];

describe("commentaryReplacer (html-react-parser v5)", () => {
  test('a.ref anchor -> <SGLink reference=...>', () => {
    const out = replace(firstNode('<a class="ref">Isaiah 1:1</a>'));
    expect(React.isValidElement(out)).toBe(true);
    expect(out.type).toBe(SGLink);
    expect(out.props.reference).toBe("Isaiah 1:1");
  });

  test('a.isa anchor -> <CommentaryTagLink> with parsed verses', () => {
    const verses = btoa(JSON.stringify({ 5: true, 6: true, 7: true }));
    const out = replace(firstNode(`<a class="isa" verses="${verses}">Tag</a>`));
    expect(React.isValidElement(out)).toBe(true);
    expect(out.type).toBe(CommentaryTagLink);
    expect(out.props.reference).toBe("Tag");
    expect(out.props.verses).toEqual([5, 6, 7]);
  });

  test('a.isa with no verses attribute -> CommentaryTagLink, empty range', () => {
    const out = replace(firstNode('<a class="isa">Tag</a>'));
    expect(out.type).toBe(CommentaryTagLink);
    expect(out.props.verses).toEqual([]);
  });

  test('malformed verses -> undefined (graceful, no throw)', () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const out = replace(firstNode('<a class="isa" verses="!!not-base64!!">Tag</a>'));
    expect(out).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("plain (non-anchor) element node -> undefined (default rendering)", () => {
    expect(replace(firstNode("<p>hello</p>"))).toBeUndefined();
  });

  test("text node -> undefined (default rendering)", () => {
    expect(replace(firstNode("just some text"))).toBeUndefined();
  });

  test("anchor with no children -> null (renders nothing)", () => {
    expect(replace(firstNode('<a class="ref"></a>'))).toBeNull();
  });

  test("other anchor class -> undefined (default rendering)", () => {
    expect(replace(firstNode('<a class="external" href="/x">x</a>'))).toBeUndefined();
  });

  test("end-to-end: Parser + render does not leak raw parser nodes", () => {
    const verses = btoa(JSON.stringify({ 2: true }));
    const html =
      `<p>Intro <a class="ref">Isaiah 1:1</a> then ` +
      `<a class="isa" verses="${verses}">Tag</a> end.</p>`;
    const { container } = render(<div>{Parser(html, { replace })}</div>);
    // The <p> and its plain text render via default handling; the anchors are
    // replaced by our components. Nothing throws -> the return-undefined
    // migration (vs. the old `return domNode`) is correct.
    expect(container.textContent).toContain("Intro");
    expect(container.textContent).toContain("then");
    expect(container.textContent).toContain("end.");
    expect(container.querySelector("[data-sg]")).not.toBeNull();
    expect(container.querySelector("[data-isa]")).not.toBeNull();
  });
});
