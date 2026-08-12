import { setTokens, activityApi } from './client.js'

let fetchCallCount = 0;
let refreshCallCount = 0;

global.fetch = async (url, options) => {
  fetchCallCount++;
  
  if (url.includes('/auth/refresh')) {
    refreshCallCount++;
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'new_access', refresh_token: 'new_refresh' })
    };
  }
  
  if (url.includes('/activity')) {
    if (refreshCallCount === 0) {
      console.log("Mock fetch: returning 401 (token expired)");
      return { ok: false, status: 401, json: async () => ({ detail: 'Expired token' }) };
    } else {
      console.log("Mock fetch: returning 200 (token refreshed)");
      return { ok: true, status: 200, json: async () => ([{ id: 1, action: 'Test' }]) };
    }
  }

  console.log("Mock fetch: fallback for url", url, options);
  return { ok: true, status: 200, json: async () => ({}) };
}

global.window = {
  dispatchEvent: (event) => console.log('Event dispatched:', event.type)
}

async function runTest() {
  console.log("Setting up tokens...")
  setTokens('old_access', 'old_refresh')
  
  console.log("Firing two simultaneous API requests...")
  const [res1, res2] = await Promise.all([
    activityApi.getActivity(),
    activityApi.getActivity()
  ])
  
  console.log("Result 1:", res1)
  console.log("Result 2:", res2)
  console.log("Refresh endpoint called:", refreshCallCount, "times")
  
  if (refreshCallCount === 1) {
    console.log("SUCCESS: Only one refresh call was made!")
  } else {
    console.error("FAILED: Refresh called multiple times.")
  }
}

runTest()
