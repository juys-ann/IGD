export async function checkWebGPU() {
  if (!navigator.gpu) {
    console.warn('WebGPU is not available in this browser.');
    return { supported: false, adapterInfo: null };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('WebGPU adapter request returned null.');
      return { supported: false, adapterInfo: null };
    }

    let adapterInfo = null;
    if (typeof adapter.requestAdapterInfo === 'function') {
      try {
        adapterInfo = await adapter.requestAdapterInfo();
      } catch (infoError) {
        console.warn('Could not request WebGPU adapter info:', infoError);
      }
    }

    console.info('WebGPU supported. Adapter info:', adapterInfo || adapter);
    return {
      supported: true,
      adapterInfo: adapterInfo
        ? {
            vendor: adapterInfo.vendor || null,
            architecture: adapterInfo.architecture || null,
            device: adapterInfo.device || null,
          }
        : null,
    };
  } catch (error) {
    console.error('WebGPU detection failed:', error);
    return { supported: false, adapterInfo: null };
  }
}
