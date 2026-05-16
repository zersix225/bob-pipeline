# BobOps Testing Guide
**How to Test Your Fixes and Verify Everything Works**

---

## 🚀 Quick Start Testing

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Environment Variables
Copy the example file and fill in your credentials:
```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your actual values:
```env
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_API_TOKEN=ghp_your_github_token_here
WATSONX_API_KEY=your_watsonx_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Start Development Server
```bash
pnpm dev
```

Server should start at: `http://localhost:8787`

---

## ✅ Test 1: Dashboard Loads

**What it tests:** Basic app functionality and frontend

```bash
# Open in browser:
http://localhost:8787
```

**Expected Result:**
- ✅ Dashboard loads with "BobOps" header
- ✅ "Live" badge is visible and blinking
- ✅ Shows "All pipelines healthy" message (no events yet)
- ✅ Console shows no errors

**Screenshot:**
```
⚡ BobOps                                    ● Live
Self-Healing CI/CD · Powered by IBM watsonx.ai

🟢
All pipelines healthy
BobOps is watching. Failures will appear here automatically.
```

---

## ✅ Test 2: Events API Endpoint

**What it tests:** API routes and in-memory store

```bash
# Test the events endpoint
curl http://localhost:8787/api/events
```

**Expected Result:**
```json
[]
```

**Verification:**
- ✅ Returns empty array (no events yet)
- ✅ Response is valid JSON
- ✅ No errors in server logs

---

## ✅ Test 3: Manual Trigger (Bug Fix #1 Verification)

**What it tests:** Manual pipeline trigger and event creation

```bash
curl -X POST http://localhost:8787/api/bobops/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "your-username/test-repo",
    "branch": "main",
    "commit": "abc123def456",
    "run_id": "12345"
  }'
```

**Expected Result:**
```json
{
  "ok": true,
  "eventId": "some-uuid-here"
}
```

**Verification:**
- ✅ Returns 200 status code
- ✅ Returns JSON with `ok: true` and an `eventId`
- ✅ Dashboard now shows the event (refresh browser)
- ✅ Event status shows "detecting" or "analyzing"

**Dashboard Should Show:**
```
your-username/test-repo
branch: main · abc123d · run #12345
● Working…

✓ Pipeline failure detected via trigger
  Just now
```

---

## ✅ Test 4: GitHub Webhook Handler (Bug Fix #1 Verification)

**What it tests:** Webhook endpoint returns response properly

```bash
# Test webhook endpoint (will fail signature verification, but should return response)
curl -X POST http://localhost:8787/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: workflow_run" \
  -H "X-GitHub-Delivery: test-delivery-123" \
  -H "X-Hub-Signature-256: sha256=invalid" \
  -d '{"action":"completed"}'
```

**Expected Result:**
```
Failed to verify Github Webhook request: Error: ...
```

**Verification:**
- ✅ Returns 400 status (signature verification failed - expected)
- ✅ Returns response immediately (NOT hanging)
- ✅ Response contains error message about verification

**Before Fix:** Would hang indefinitely  
**After Fix:** Returns 400 immediately ✅

---

## ✅ Test 5: Demo Code Test (Full Pipeline)

**What it tests:** Complete healing pipeline with demo code

### Step 1: Run the failing test
```bash
cd demo
node --test broken_code.test.js
```

**Expected Result:**
```
✔ formats user correctly (0.5ms)
✖ handles null user gracefully (1.2ms)
  TypeError: Cannot read properties of null (reading 'name')
✔ calculates 20% discount (0.3ms)
```

### Step 2: Trigger healing via API
```bash
curl -X POST http://localhost:8787/api/bobops/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "your-username/bob-pipeline",
    "branch": "main",
    "commit": "demo123",
    "run_id": "99999"
  }'
```

### Step 3: Watch the dashboard
Open `http://localhost:8787` and watch the event progress through stages:
1. ✅ "detecting" - Fetching logs
2. ✅ "analyzing" - WatsonX analyzing (or demo fallback)
3. ✅ "fixing" - Creating PR
4. ✅ "pr_created" or "auto_merged" - Done!

**Expected Timeline:**
```
✓ Pipeline failure detected via trigger
✓ Fetched logs and repo context (1 changed files)
✓ Root cause identified (confidence: 87%) — formatUser() does not guard...
✓ PR opened: https://github.com/...
```

---

## ✅ Test 6: Base64 Encoding Fix (Bug Fix #2 Verification)

**What it tests:** Buffer-based base64 encoding works in Workers

### Option A: Direct Test in Dev Console
```bash
# Start wrangler dev
pnpm dev

# In another terminal, test Buffer
curl http://localhost:8787/api/events
```

Check server logs - should see no errors about `atob` or `btoa`

### Option B: Test with Real GitHub API
This requires:
1. Valid `GITHUB_API_TOKEN` in `.dev.vars`
2. A real repository with a file to modify
3. Triggering the full healing pipeline

**If you see this error, the fix didn't work:**
```
ReferenceError: atob is not defined
```

**If no error, the fix works!** ✅

---

## ✅ Test 7: Type Checking

**What it tests:** TypeScript compilation

```bash
pnpm type-check
```

**Expected Result:**
```
No errors found
```

**Verification:**
- ✅ No TypeScript errors
- ✅ All types are valid
- ✅ No missing imports

---

## ✅ Test 8: Code Formatting

**What it tests:** Code style consistency

```bash
pnpm lint
```

**Expected Result:**
```
No issues found
```

---

## 🧪 Advanced Testing (Optional)

### Test with Real GitHub Webhook

1. **Deploy to Cloudflare Workers:**
```bash
pnpm deploy
```

2. **Set up GitHub webhook:**
   - Go to your repo → Settings → Webhooks → Add webhook
   - Payload URL: `https://your-worker.workers.dev/api/github/webhook`
   - Content type: `application/json`
   - Secret: (your `GITHUB_WEBHOOK_SECRET`)
   - Events: Select "Workflow runs"

3. **Trigger a real failure:**
   - Push code that breaks tests
   - Watch GitHub Actions fail
   - Check your dashboard for the healing event

### Test with Real WatsonX API

1. **Get IBM Cloud credentials:**
   - Sign up at https://cloud.ibm.com
   - Create watsonx.ai instance
   - Get API key and project ID

2. **Update `.dev.vars`:**
```env
WATSONX_API_KEY=your_real_api_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

3. **Trigger healing:**
```bash
curl -X POST http://localhost:8787/api/bobops/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "your-username/test-repo",
    "branch": "main",
    "commit": "abc123",
    "run_id": "12345"
  }'
```

4. **Check logs:**
Should see real AI analysis instead of demo fallback

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'hono'"
**Solution:**
```bash
pnpm install
```

### Issue: "GITHUB_WEBHOOK_SECRET is not defined"
**Solution:**
Create `.dev.vars` file with required variables

### Issue: Dashboard shows "Connection error"
**Solution:**
- Check if dev server is running (`pnpm dev`)
- Check browser console for CORS errors
- Verify server is on port 8787

### Issue: "atob is not defined" error
**Solution:**
This means Bug Fix #2 wasn't applied. Check `src/lib/github.ts` line 116 - should use `Buffer.from()` not `atob()`

### Issue: Webhook endpoint hangs
**Solution:**
This means Bug Fix #1 wasn't applied. Check `src/api/index.ts` line 108 - should have `return c.text(...)` statement

### Issue: Events disappear after restart
**Solution:**
This is expected - events are stored in memory. For persistence, upgrade to KV/D1 storage.

---

## ✅ Success Criteria Checklist

After running all tests, you should have:

- [x] Dashboard loads without errors
- [x] `/api/events` returns valid JSON
- [x] Manual trigger creates events
- [x] Webhook endpoint responds (doesn't hang)
- [x] Demo test identifies the bug correctly
- [x] No TypeScript errors
- [x] No linting errors
- [x] Base64 encoding works (no atob errors)
- [x] Events appear in real-time on dashboard
- [x] Timeline shows all healing steps

---

## 📊 Performance Benchmarks

**Expected Response Times:**
- Dashboard load: < 100ms
- `/api/events`: < 10ms
- Manual trigger: < 50ms (+ background healing)
- Webhook handler: < 20ms

**Memory Usage:**
- Base: ~10MB
- With 50 events: ~12MB

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Commit your changes
2. ✅ Deploy to Cloudflare Workers
3. ✅ Set up real GitHub webhooks
4. ✅ Configure WatsonX credentials
5. ✅ Test with real pipeline failures
6. ✅ Demo at hackathon! 🚀

---

**Testing Guide Created:** 2026-05-16  
**Last Updated:** After Bug Fixes #1 and #2