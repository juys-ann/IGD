import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.4';

// Configure Transformers.js to use appropriate backend
env.allowLocalModels = false;
env.allowRemoteModels = true;

let model = null;
let isReady = false;
let webGPUSupported = false;

// Initialize the model
self.onmessage = async (event) => {
  const { type, useWebGPU, text, context } = event.data;

  try {
    if (type === 'init') {
      webGPUSupported = useWebGPU;
      console.log('[Worker] Initializing with WebGPU:', webGPUSupported);

      // Post progress updates during model initialization
      self.postMessage({ status: 'loading', progress: 0, detail: 'Starting model initialization...' });

      try {
        // Initialize the model with progress callback
        model = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0', {
          progress_callback: (progress) => {
            const progressPercent = Math.round(progress.progress * 100);
            console.log('[Worker] Model download progress:', progressPercent + '%');
            self.postMessage({
              status: 'loading',
              progress: progressPercent,
              detail: `Downloading model: ${progressPercent}%`,
            });
          },
        });

        isReady = true;
        console.log('[Worker] Model initialized successfully');
        self.postMessage({
          status: 'ready',
          progress: 100,
          detail: `Local LLM ready on ${webGPUSupported ? 'WebGPU' : 'WASM'}`,
        });
      } catch (modelError) {
        console.error('[Worker] Model initialization failed:', modelError);
        self.postMessage({
          status: 'error',
          error: `Model initialization failed: ${modelError.message}`,
        });
      }
    } else if (type === 'generate') {
      if (!isReady || !model) {
        self.postMessage({
          status: 'error',
          error: 'Model not ready. Please wait for initialization.',
        });
        return;
      }

      console.log('[Worker] Generating text for:', text);

      try {
        // Build prompt with RAG context if provided
        let prompt = text;
        if (context && context.trim()) {
          prompt = `Context from your journal:\n${context}\n\nBased on this, ${text}`;
        }

        // Generate response with temperature and max tokens
        const output = await model(prompt, {
          max_new_tokens: 256,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
        });

        const response = output[0].generated_text;
        console.log('[Worker] Generation complete');

        self.postMessage({
          status: 'generated',
          output: response,
        });
      } catch (genError) {
        console.error('[Worker] Text generation failed:', genError);
        self.postMessage({
          status: 'error',
          error: `Text generation failed: ${genError.message}`,
        });
      }
    }
  } catch (error) {
    console.error('[Worker] Unexpected error:', error);
    self.postMessage({
      status: 'error',
      error: `Unexpected worker error: ${error.message}`,
    });
  }
};

console.log('[Worker] Worker script loaded successfully');
