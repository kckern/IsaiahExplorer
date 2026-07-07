import React from "react";

/**
 * Builds the `replace` callback passed to html-react-parser (v5) when rendering
 * commentary HTML.
 *
 * html-react-parser v5 notes that drive this implementation:
 *  - Nodes are domhandler nodes: element nodes have `.type === 'tag'`, `.name`,
 *    `.attribs` ({ [name]: string }) and `.children`; text nodes have
 *    `.type === 'text'` and `.data`.
 *  - To leave a node with its DEFAULT rendering you must return `undefined`
 *    (or nothing). Returning the `domNode` itself (as the old 0.4 code did)
 *    leaks a raw parser node into the React tree and crashes on render.
 *
 * The link components are injected rather than imported so this module stays
 * free of heavy/asset-importing dependencies (App.js, images) and can be unit
 * tested without a browser.
 *
 * @param {{ verseDatatoArray: (obj: any) => number[] }} app
 * @param {{ SGLink: React.ComponentType<any>, CommentaryTagLink: React.ComponentType<any> }} links
 * @returns {(domNode: any) => React.ReactElement | null | undefined}
 */
export function commentaryReplacer(app, { SGLink, CommentaryTagLink }) {
  return function replace(domNode) {
    // Not an <a> element (text nodes, <p>, etc.) -> default rendering.
    if (!domNode || domNode.name !== "a" || !domNode.attribs) return undefined;

    // Anchor with no children -> render nothing (preserves prior behavior).
    if (domNode.children[0] === undefined) return null;

    if (domNode.attribs.class === "ref")
      return <SGLink reference={domNode.children[0].data} />;

    if (domNode.attribs.class === "isa") {
      var rowRange = [];
      if (domNode.attribs.verses !== undefined) {
        try {
          var obj = JSON.parse(atob(domNode.attribs.verses));
          rowRange = app.verseDatatoArray(obj);
        } catch (e) {
          console.warn("Bad verses attribute in commentary HTML", e);
          return undefined;
        }
      }
      return <CommentaryTagLink reference={domNode.children[0].data} verses={rowRange} />;
    }

    // Any other anchor -> default rendering.
    return undefined;
  };
}
