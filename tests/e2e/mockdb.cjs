/*
 * Adapter: Playwright-Route -> gemeinsame nachgebildete Schnittstelle
 * (lib/demo/mockApi.ts, auch Grundlage der Demo). Node laedt die
 * TypeScript-Datei direkt (Typen werden entfernt).
 */
const api = require("../../lib/demo/mockApi.ts");

function createMock(options = {}) {
  const mock = api.createMockApi(options);
  async function handle(route, uid) {
    const req = route.request();
    const res = await mock.handle({ method: req.method(), url: req.url(), headers: req.headers(), body: req.postData() }, uid);
    return route.fulfill({ status: res.status, json: res.json });
  }
  return { ...mock, handle };
}

module.exports = { createMock, COACH: api.COACH, ATH: api.ATH, ago: api.ago, key: api.dateKey };
