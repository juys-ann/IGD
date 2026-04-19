# Worker Setup & Troubleshooting Guide

## What Was Fixed

### 1. **Worker Location**
- **File**: `public/ai.worker.js`
- **Path in Component**: `/ai.worker.js` (absolute path)
- **Why**: Public folder is served directly by Vite's dev server, avoiding module resolution issues

### 2. **Worker Instantiation in EchoChamber.jsx**
```javascript
// ✅ CORRECT: Absolute path from public folder
workerRef.current = new Worker('/ai.worker.js', { type: 'module' })
```

### 3. **Vite Configuration** (`vite.config.js`)
Added:
- `worker: { format: 'es' }` - Ensures workers use ES module format
- `optimizeDeps.esbuildOptions.supported['top-level-await']` - Transformers.js needs this

### 4. **Enhanced Error Handling**
- **Worker**: Try/catch around model initialization with detailed error messages
- **Component**:
  - Worker creation wrapped in try/catch
  - Message handler errors logged to console
  - Comprehensive error display at top of chat
  - Worker.onerror event listener for worker crashes

### 5. **Model Loading**
- **Source**: Transformers.js CDN (auto-downloaded from Hugging Face)
- **Model**: `Xenova/TinyLlama-1.1B-Chat-v1.0`
- **First Load**: ~500MB download (cached in browser)

---

## Testing Checklist

### Before testing, ensure:
- [ ] `public/ai.worker.js` exists
- [ ] `src/pages/EchoChamber.jsx` uses `/ai.worker.js`
- [ ] `vite.config.js` has worker config updates
- [ ] You have at least one journal entry (for RAG context)

### To debug:

1. **Open DevTools Console** (F12)
2. **Check for these logs**:
   ```
   ✅ "Worker instantiated successfully"
   ✅ "Initializing worker with WebGPU: true/false"
   ✅ "Model ready: Local LLM ready on WASM/WEBGPU"
   ```

3. **If you see errors**:
   - Check Network tab → look for `/ai.worker.js` response (should be JavaScript, not HTML)
   - Check console for detailed error messages (will show in red banner in chat)

---

## Common Issues & Fixes

### ❌ "JSON is not valid"
**Cause**: Browser received HTML instead of worker module
**Fix**: Check that `public/ai.worker.js` exists and is valid JavaScript

### ❌ "Worker not defined"
**Cause**: Worker file not found at `/ai.worker.js`
**Fixes**:
- Run `npm run dev` to restart Vite dev server
- Verify file exists: `ls public/ai.worker.js`
- Hard refresh browser (Ctrl+Shift+R on Windows)

### ❌ "CORS error" or "Failed to load"
**Cause**: Model download blocked
**Fixes**:
- Check browser console for specific error
- Ensure internet connection (model downloads from Hugging Face)
- Try incognito/private mode
- Check if corporate proxy/firewall blocks Hugging Face

### ❌ "Model initialization failed"
**Cause**: Transformers.js pipeline error (detailed in error banner)
**Fixes**:
- Check console error message for specifics
- Ensure `@xenova/transformers` is installed: `npm ls @xenova/transformers`
- Try clearing browser cache: DevTools → Application → Clear Storage → Clear All

### ❌ Worker shows in Network tab but chat won't load model
**Cause**: WASM or WebGPU issues
**Fixes**:
- Check DevTools → console for model download logs
- Model downloads async; wait for progress to reach 100%
- Try forcing CPU-only mode (browser will auto-fallback to WASM if WebGPU unavailable)

---

## How RAG Works

1. User sends message: "Tell me about my childhood"
2. `retrieveRAGContext()` splits message into keywords
3. Scores journal entries by keyword overlap
4. Returns top 3 matches (or most recent if no matches)
5. Injected into model as system context
6. Model generates response grounded in actual memories

---

## File Structure

```
inter-generational-dialogue/
├── public/
│   └── ai.worker.js          ← 🔴 NEW: Main worker file
├── src/
│   ├── engine/
│   │   └── worker.js          ← OLD: Kept for reference, not used
│   ├── pages/
│   │   └── EchoChamber.jsx    ← Updated: Uses /ai.worker.js
│   └── App.jsx                ← Route already configured
├── vite.config.js             ← Updated: Worker + top-level-await support
└── package.json
```

---

## Performance Notes

- **First Load**: ~10-30 seconds (model download + compilation, one-time)
- **Subsequent Responses**: 2-5 seconds (on modern hardware)
- **Model Size**: 1.1B parameters (optimized for browser)
- **Memory**: ~800MB-1.2GB during inference

Monitor DevTools → Performance tab to track model loading.

---

## Next Steps

1. Create a journal entry if you don't have one yet
2. Navigate to `/echo`
3. Watch console for initialization logs
4. Once progress bar completes, try sending a message
5. Check error banner for any issues

**Questions?** Check console output—detailed error messages are logged for every step.
