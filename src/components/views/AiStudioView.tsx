import { useState, useRef } from 'react';
import { useTimelineStore } from '../../stores/timeline-store';
import { usePatternStore } from '../../stores/pattern-store';

interface GenerationResult {
  taskId: string;
  modelDisplayName: string;
  state: 'success' | 'fail' | 'timeout';
  resultUrls?: string[];
  failMsg?: string;
}

type Category = 'music' | 'beat' | 'vocal' | 'sfx';

const CATEGORY_MODELS: Record<Category, { key: string; label: string; costNote: string }> = {
  beat:  { key: 'suno-generate',            label: 'Beat / Song (Suno)',        costNote: '~$0.06' },
  music: { key: 'veo-3-1-lite',             label: 'Cinematic Music (Veo Lite)', costNote: '~$0.15' },
  vocal: { key: 'elevenlabs-tts-multilingual', label: 'AI Vocal (ElevenLabs)',  costNote: '~$0.012/100 chars' },
  sfx:   { key: 'elevenlabs-sound-effect',  label: 'Sound Effect (ElevenLabs)', costNote: '~$0.006' },
};

const PROMPT_SUGGESTIONS: Record<Category, string[]> = {
  beat:  ['Trap beat with 808 bass, hi-hats, and dark melody', 'Lo-fi chill hop beat with vinyl crackle', 'Upbeat pop beat with claps and synth lead'],
  music: ['Cinematic orchestral swell, epic and emotional', 'Ambient electronic soundscape, futuristic'],
  vocal: ['Hey, welcome to my new track. Let\'s go!', 'Verse one, I\'m on the rise, watch me climb'],
  sfx:   ['Thunder rolling over hills in the distance', 'Vinyl record scratch and rewind', 'Crowd cheering in a stadium'],
};

export function AiStudioView() {
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem('kieai_key') ?? '');
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);

  const [category, setCategory]     = useState<Category>('beat');
  const [prompt, setPrompt]         = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult]         = useState<GenerationResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [log, setLog]               = useState<string[]>([]);

  const addTrack = useTimelineStore(s => s.addTrack);
  const addClip  = useTimelineStore(s => s.addClip);
  const tracks   = useTimelineStore(s => s.tracks);

  const logRef = useRef<HTMLDivElement>(null);

  function saveKey() {
    localStorage.setItem('kieai_key', apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setShowKeyInput(false);
  }

  function appendLog(msg: string) {
    setLog(prev => [...prev, msg]);
    setTimeout(() => logRef.current?.scrollTo(0, 99999), 50);
  }

  async function generate() {
    if (!apiKey) { setShowKeyInput(true); return; }
    if (!prompt.trim()) { setError('Enter a prompt first.'); return; }

    setIsGenerating(true);
    setResult(null);
    setError(null);
    setLog([]);
    appendLog(`Generating with ${CATEGORY_MODELS[category].label}…`);

    const model = CATEGORY_MODELS[category];

    try {
      const body: Record<string, unknown> = {
        model: modelKeyToApiModel(model.key),
        input: buildInput(category, prompt),
      };

      appendLog('Submitting to Kie.ai…');
      const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const createData = await createRes.json();
      if (createData.code !== 200) throw new Error(createData.msg ?? 'Generation failed');

      const taskId: string = createData.data.taskId;
      appendLog(`Task ${taskId} — polling…`);

      // Poll until done
      const pollResult = await poll(taskId);
      setResult({ ...pollResult, taskId });

      if (pollResult.state === 'success' && pollResult.resultUrls?.[0]) {
        appendLog(`Done! URL: ${pollResult.resultUrls[0]}`);
        addResultToTimeline(pollResult.resultUrls[0], prompt);
      } else {
        setError(pollResult.failMsg ?? 'Generation failed');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function poll(taskId: string): Promise<Omit<GenerationResult, 'taskId'>> {
    const timeout = Date.now() + 5 * 60 * 1000;
    while (Date.now() < timeout) {
      await new Promise(r => setTimeout(r, 4000));
      const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.msg);
      const state = data.data.state;
      const progress = data.data.progress;
      appendLog(`State: ${state}${progress != null ? ` (${progress}%)` : ''}`);
      if (state === 'success') {
        const raw = data.data.resultJson;
        let urls: string[] = [];
        try { urls = JSON.parse(raw)?.resultUrls ?? JSON.parse(raw)?.result_urls ?? []; } catch { /* */ }
        return { state: 'success', modelDisplayName: CATEGORY_MODELS[category].label, resultUrls: urls };
      }
      if (state === 'fail') {
        return { state: 'fail', modelDisplayName: CATEGORY_MODELS[category].label, failMsg: data.data.failMsg };
      }
    }
    return { state: 'timeout', modelDisplayName: CATEGORY_MODELS[category].label };
  }

  function addResultToTimeline(url: string, name: string) {
    let trackId = tracks.find(t => t.name === 'AI Generated')?.id;
    if (!trackId) trackId = addTrack('audio', 'AI Generated');
    addClip({
      trackId,
      type: 'audio',
      name: name.slice(0, 30),
      startBeat: 0,
      duration: 16,
      color: '#bb8fce',
      audioBufferId: url,
    });
    appendLog('Added to timeline as audio clip.');
  }

  return (
    <div className="ai-studio">
      <div className="ai-studio__header">
        <h2 className="ai-studio__title">AI Studio</h2>
        <p className="ai-studio__subtitle">Generate beats, music, vocals, and sound effects with Kie.ai</p>
      </div>

      {/* API key setup */}
      {showKeyInput ? (
        <div className="panel ai-studio__key-panel">
          <div className="panel__header">
            <span className="panel__title">Kie.ai API Key</span>
          </div>
          <p className="text-sm text-secondary" style={{ marginBottom: 10 }}>
            Get a free key at <strong>kie.ai/api-key</strong>. Your key stays on this device only.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              className="ai-studio__key-input"
              placeholder="Paste your Kie.ai API key…"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
            />
            <button className="btn btn--primary" onClick={saveKey}>Save</button>
          </div>
        </div>
      ) : (
        <div className="ai-studio__key-status">
          <span className="text-xs text-muted">Kie.ai key active</span>
          <button className="btn btn--sm btn--ghost" onClick={() => setShowKeyInput(true)}>Change</button>
        </div>
      )}

      {/* Category selector */}
      <div className="panel">
        <div className="ai-studio__categories">
          {(Object.entries(CATEGORY_MODELS) as [Category, typeof CATEGORY_MODELS[Category]][]).map(([key, val]) => (
            <button
              key={key}
              className={`ai-studio__cat-btn ${category === key ? 'ai-studio__cat-btn--active' : ''}`}
              onClick={() => { setCategory(key); setPrompt(''); setResult(null); setError(null); }}
            >
              <span className="ai-studio__cat-icon">{catIcon(key)}</span>
              <span className="ai-studio__cat-name">{catName(key)}</span>
              <span className="ai-studio__cat-cost">{val.costNote}</span>
            </button>
          ))}
        </div>

        {/* Prompt */}
        <div style={{ marginTop: 16 }}>
          <textarea
            className="ai-studio__prompt"
            placeholder={`Describe the ${catName(category)} you want…`}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
          />
          <div className="ai-studio__suggestions">
            {PROMPT_SUGGESTIONS[category].map(s => (
              <button key={s} className="ai-studio__suggestion" onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 items-center" style={{ marginTop: 12 }}>
          <button
            className="btn btn--primary"
            onClick={generate}
            disabled={isGenerating || !prompt.trim()}
            style={{ flex: 1 }}
          >
            {isGenerating ? 'Generating…' : `Generate ${catName(category)}`}
          </button>
          <span className="text-xs text-muted">{CATEGORY_MODELS[category].costNote} per generation</span>
        </div>
      </div>

      {/* Progress log */}
      {log.length > 0 && (
        <div className="panel ai-studio__log" ref={logRef}>
          {log.map((l, i) => <div key={i} className="text-xs text-secondary">{l}</div>)}
        </div>
      )}

      {/* Result */}
      {result?.state === 'success' && result.resultUrls?.[0] && (
        <div className="panel ai-studio__result">
          <div className="panel__header">
            <span className="panel__title">Generated — added to timeline</span>
          </div>
          <audio controls src={result.resultUrls[0]} style={{ width: '100%', marginTop: 8 }} />
          <a className="btn btn--sm" href={result.resultUrls[0]} download style={{ marginTop: 8 }}>
            Download
          </a>
        </div>
      )}

      {error && (
        <div className="panel" style={{ borderColor: 'var(--accent-red)' }}>
          <span className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function modelKeyToApiModel(key: string): string {
  const map: Record<string, string> = {
    'suno-generate':               'suno/v4',
    'veo-3-1-lite':                'google/veo3_lite',
    'elevenlabs-tts-multilingual': 'elevenlabs/text-to-speech-multilingual-v2',
    'elevenlabs-sound-effect':     'elevenlabs/sound-effect-v2',
  };
  return map[key] ?? key;
}

function buildInput(category: Category, prompt: string): Record<string, unknown> {
  if (category === 'beat')  return { prompt, customMode: false, instrumental: true, model: 'V5' };
  if (category === 'music') return { prompt, aspect_ratio: '16:9', resolution: '720p' };
  if (category === 'vocal') return { text: prompt, voice: 'rachel' };
  if (category === 'sfx')   return { prompt };
  return { prompt };
}

function catName(c: Category) {
  return { beat: 'Beat / Song', music: 'Music', vocal: 'AI Vocal', sfx: 'Sound FX' }[c];
}

function catIcon(c: Category) {
  return { beat: '🥁', music: '🎵', vocal: '🎤', sfx: '🔊' }[c];
}
