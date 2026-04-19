# Inter-Generational Dialogue — Project Skeleton

## ⚡ Install Commands

```bash
# 1. Create project (if not done)
npm create vite@latest inter-generational-dialogue -- --template react
cd inter-generational-dialogue

# 2. Install all dependencies
npm install react-router-dom lucide-react

# 3. Install Tailwind CSS (Vite plugin approach)
npm install -D tailwindcss @tailwindcss/vite

# 4. In vite.config.js — add the Tailwind plugin:
# import tailwindcss from '@tailwindcss/vite'
# plugins: [react(), tailwindcss()]

# 5. Replace src/index.css with the provided file (adds Google Fonts + directives)

# 6. Run dev server
npm run dev
```

---

## 📁 Proposed `src/` Folder Structure

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Router root
├── index.css                   # Tailwind + fonts
│
├── components/                 # Reusable UI components
│   ├── Layout.jsx              # ← Sidebar + Header wrapper (done)
│   ├── Sidebar.jsx             # ← Fixed nav sidebar (done)
│   ├── PrivacyHeader.jsx       # ← Top bar + shield badge (done)
│   ├── ui/                     # Atomic UI (buttons, badges, cards)
│   │   ├── Badge.jsx
│   │   ├── Card.jsx
│   │   └── Button.jsx
│   └── charts/                 # Sprint 7: Pattern Radar & visualizations
│       └── PatternRadar.jsx
│
├── pages/                      # One file per route/feature
│   ├── Dashboard.jsx           # ← Sprint 1 (done placeholder)
│   ├── ArchiveIngestion.jsx    # ← Sprint 2 (done placeholder)
│   ├── EchoChamber.jsx         # ← Sprint 5 (done placeholder)
│   └── JournalEntry.jsx        # ← Sprint 1 (done placeholder)
│
├── hooks/                      # Custom React hooks
│   ├── useLLM.js               # Sprint 1: WebGPU/WASM LLM lifecycle
│   ├── useArchive.js           # Sprint 2: File ingestion state
│   ├── useVectorDB.js          # Sprint 3-4: Local vector DB queries
│   └── useChat.js              # Sprint 5-6: RAG chat session state
│
├── services/                   # Pure logic / non-React modules
│   ├── llm/
│   │   ├── webgpuLoader.js     # Sprint 1: Load model via WebGPU
│   │   └── inferenceEngine.js  # Sprint 1: Run local inference
│   ├── ingestion/
│   │   ├── docxParser.js       # Sprint 2: mammoth.js wrapper
│   │   ├── textParser.js       # Sprint 2: .txt parser
│   │   └── metadataExtractor.js # Sprint 2: Date/timestamp regex
│   ├── knowledge/
│   │   ├── knowledgeGraph.js   # Sprint 3: AKG entity-theme linker
│   │   └── vectorStore.js      # Sprint 3: Local vector DB (e.g. HNSWlib-WASM)
│   ├── rag/
│   │   ├── retriever.js        # Sprint 5: Cosine similarity search
│   │   └── memoryInjector.js   # Sprint 5: Injects past entries into prompt
│   └── analytics/
│       ├── sentimentAnalyzer.js # Sprint 7: NLP → radar coordinates
│       └── patternDetector.js   # Sprint 7-8: Trajectory analysis
│
└── context/                    # React Context providers
    ├── PrivacyContext.jsx       # Global: network monitor, shield status
    ├── ArchiveContext.jsx       # Global: ingested entries store
    └── LLMContext.jsx           # Global: model load state & inference API
```

---

## 🗺️ Sprint-to-File Mapping

| Sprint | Goal | Key Files |
|--------|------|-----------|
| 1 | WebGPU/WASM environment + core UI | `services/llm/`, `hooks/useLLM.js`, `context/LLMContext.jsx` |
| 2 | Archive ingestion pipeline | `pages/ArchiveIngestion.jsx`, `services/ingestion/` |
| 3 | Agentic Knowledge Graph | `services/knowledge/knowledgeGraph.js` |
| 4 | Pattern surfacing (proactive RAG) | `services/knowledge/vectorStore.js`, `hooks/useVectorDB.js` |
| 5 | Memory Resurrection chat | `pages/EchoChamber.jsx`, `services/rag/` |
| 6 | Long-context window management | `hooks/useChat.js` (sliding window logic) |
| 7 | Pattern Radar visualization | `components/charts/PatternRadar.jsx`, `services/analytics/` |
| 8 | Behavioral Foresight + final polish | New `FutureTrajectory` component |

---

## 🎨 Design System

- **Display font:** Playfair Display (editorial, warm serif for headings)
- **Body font:** DM Sans (clean, legible sans-serif)
- **Mono font:** JetBrains Mono (sprint labels, metadata)
- **Accent:** Teal (`teal-400 / teal-500`) — privacy, health, local-first
- **Secondary accent:** Indigo (`indigo-400`) — AI/intelligence signals
- **Base palette:** Stone grays — warm neutrals vs cold slate
