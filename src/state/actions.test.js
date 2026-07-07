import { buildActions } from "./actions";

function makeFakeApp() {
  return {
    state: {},
    setState: jest.fn(),
    setActiveVerse: jest.fn(),
    setActiveTag: jest.fn(),
    search: jest.fn(),
    setAudioMode: jest.fn(),
    setTagPanel: jest.fn(),
    closeSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
}

describe("buildActions", () => {
  it("binds whitelisted methods to the app instance", () => {
    const app = makeFakeApp();
    const actions = buildActions(app);
    actions.setActiveVerse(17656);
    expect(app.setActiveVerse).toHaveBeenCalledWith(17656);
    actions.search("zion");
    expect(app.search).toHaveBeenCalledWith("zion");
  });

  it("does NOT expose raw setState", () => {
    const actions = buildActions(makeFakeApp());
    expect(actions.setState).toBeUndefined();
  });

  it("returns a frozen object", () => {
    const actions = buildActions(makeFakeApp());
    expect(Object.isFrozen(actions)).toBe(true);
  });

  it("omits methods the app does not implement", () => {
    const actions = buildActions(makeFakeApp());
    // makeFakeApp has no showcaseTag → it must not appear as an action
    expect(actions.showcaseTag).toBeUndefined();
  });

  it("setMobilePane is a named action that flips only mobilePane via setState", () => {
    const app = makeFakeApp();
    const actions = buildActions(app);
    actions.setMobilePane("read");
    expect(app.setState).toHaveBeenCalledWith({ mobilePane: "read" });
  });
});
