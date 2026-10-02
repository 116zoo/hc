import type { PdfEngine } from "@embedpdf/models"

const PDFIUM_VERSION = "2.15.1"
const PDFIUM_WASM_URL_DEV = `https://cdn.jsdelivr.net/npm/@embedpdf/pdfium@${PDFIUM_VERSION}/dist/pdfium.wasm`
const PDFIUM_WASM_URL_PROD = `/pdfium/pdfium-${PDFIUM_VERSION}.wasm`

let sharedEnginePromise: Promise<PdfEngine> | null = null

function getPdfiumWasmUrl(): string {
  // In production build, use local WASM file; in development, use CDN
  if (typeof import.meta !== "undefined" && import.meta.env?.PROD) {
    return PDFIUM_WASM_URL_PROD
  }
  return PDFIUM_WASM_URL_DEV
}

export function loadSharedPdfEngine() {
  sharedEnginePromise ??= import("@embedpdf/engines/pdfium-worker-engine").then(
    ({ createPdfiumEngine }) => createPdfiumEngine(getPdfiumWasmUrl(), {})
  )

  return sharedEnginePromise
}