/**
 * Global mock for the browser WebExtension API used in background.js.
 * Jest sets this up before each test file via the setupFiles config.
 */

// In-memory storage backing for tests
let _localStore = {};
let _alarms = {};

const browser = {
  storage: {
    local: {
      get: jest.fn(async (key) => {
        const k = typeof key === 'string' ? key : Object.keys(key)[0];
        return { [k]: _localStore[k] };
      }),
      set: jest.fn(async (obj) => {
        Object.assign(_localStore, obj);
      }),
    },
    sync: {
      get: jest.fn(async (defaults) => ({ ...defaults })),
    },
  },
  alarms: {
    create: jest.fn(async (name, opts) => {
      _alarms[name] = opts;
    }),
    clear: jest.fn(async (name) => {
      delete _alarms[name];
    }),
    onAlarm: { addListener: jest.fn() },
  },
  tabs: {
    create: jest.fn(async () => ({ id: Math.random() })),
    remove: jest.fn(async () => {}),
    query: jest.fn(async () => []),
  },
  notifications: {
    create: jest.fn(),
  },
  runtime: {
    onInstalled: { addListener: jest.fn() },
    onStartup: { addListener: jest.fn() },
    onMessage: { addListener: jest.fn() },
    getURL: jest.fn((path) => `moz-extension://test/${path}`),
  },
};

global.browser = browser;

// Helpers used by tests to inspect/reset state
global.__resetBrowserMock = () => {
  _localStore = {};
  _alarms = {};
  jest.clearAllMocks();

  browser.storage.local.get.mockImplementation(async (key) => {
    const k = typeof key === 'string' ? key : Object.keys(key)[0];
    return { [k]: _localStore[k] };
  });
  browser.storage.local.set.mockImplementation(async (obj) => {
    Object.assign(_localStore, obj);
  });
  browser.storage.sync.get.mockImplementation(async (defaults) => ({ ...defaults }));
  browser.alarms.create.mockImplementation(async (name, opts) => {
    _alarms[name] = opts;
  });
  browser.alarms.clear.mockImplementation(async (name) => {
    delete _alarms[name];
  });
  browser.tabs.create.mockImplementation(async () => ({ id: Math.random() }));
  browser.tabs.remove.mockImplementation(async () => {});
  browser.tabs.query.mockImplementation(async () => []);
  browser.notifications.create.mockImplementation(() => {});
  browser.runtime.getURL.mockImplementation((path) => `moz-extension://test/${path}`);
};

global.__getLocalStore = () => _localStore;
global.__getAlarms = () => _alarms;
