import { useState, useCallback, useRef, useEffect } from 'react';
import { useSoundLibraryStore, type SoundCategory, type SoundItem } from '../../stores/sound-library-store';
import * as Tone from 'tone';

interface SoundBrowserProps {
  onSelectSound?: (sound: SoundItem) => void;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<SoundCategory | 'all', string> = {
  all: '🎵',
  drums: '🥁',
  bass: '🎸',
  synth: '🎹',
  vocals: '🎤',
  fx: '✨',
  keys: '🎹',
  guitar: '🎸',
  loops: '🔄',
  'one-shots': '💥',
  user: '📁',
};

const CATEGORY_LABELS: Record<SoundCategory | 'all', string> = {
  all: 'All',
  drums: 'Drums',
  bass: 'Bass',
  synth: 'Synths',
  vocals: 'Vocals',
  fx: 'FX',
  keys: 'Keys',
  guitar: 'Guitar',
  loops: 'Loops',
  'one-shots': 'One-Shots',
  user: 'My Samples',
};

export function SoundBrowser({ onSelectSound, compact = false }: SoundBrowserProps) {
  const {
    activeCategory,
    setCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    filterByType,
    setFilterByType,
    getFilteredSounds,
    toggleFavorite,
    addToRecentlyUsed,
    previewingSound,
    setPreviewingSound,
    isPreviewPlaying,
    setIsPreviewPlaying,
    getFavorites,
    getRecentlyUsed,
  } = useSoundLibraryStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'browse' | 'favorites' | 'recent'>('browse');

  const playerRef = useRef<Tone.Player | null>(null);
  const filteredSounds = getFilteredSounds();
  const favorites = getFavorites();
  const recentlyUsed = getRecentlyUsed();

  // Get sounds based on active tab
  const displaySounds = activeTab === 'browse'
    ? filteredSounds
    : activeTab === 'favorites'
    ? favorites
    : recentlyUsed;

  // Handle preview
  const handlePreview = useCallback(async (sound: SoundItem) => {
    try {
      await Tone.start();

      // Stop existing preview
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }

      if (previewingSound === sound.id && isPreviewPlaying) {
        // Stop preview
        setIsPreviewPlaying(false);
        setPreviewingSound(null);
        return;
      }

      // Note: In a real app, you'd load the actual audio file here
      // For demo purposes, we'll just create a simple tone
      const synth = new Tone.Synth().toDestination();
      synth.triggerAttackRelease('C4', '8n');

      setPreviewingSound(sound.id);
      setIsPreviewPlaying(true);

      // Auto-stop after duration
      setTimeout(() => {
        setIsPreviewPlaying(false);
        setPreviewingSound(null);
      }, Math.min(sound.duration * 1000, 3000));

    } catch (error) {
      console.error('Failed to preview sound:', error);
    }
  }, [previewingSound, isPreviewPlaying, setPreviewingSound, setIsPreviewPlaying]);

  // Handle select
  const handleSelect = useCallback((sound: SoundItem) => {
    addToRecentlyUsed(sound.id);
    onSelectSound?.(sound);
  }, [addToRecentlyUsed, onSelectSound]);

  // Handle import
  const handleImport = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of files) {
        useSoundLibraryStore.getState().addSound({
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'user',
          type: 'sample',
          duration: 0, // Would need to calculate from audio
          tags: [],
          path: URL.createObjectURL(file),
          favorite: false,
        });
      }
    };

    input.click();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, []);

  const categories: (SoundCategory | 'all')[] = [
    'all', 'drums', 'bass', 'synth', 'vocals', 'fx', 'loops', 'one-shots', 'user'
  ];

  return (
    <div className={`sound-browser ${compact ? 'compact' : ''}`}>
      {/* Header */}
      <div className="sound-browser-header">
        <h3>Sound Library</h3>
        <button className="btn btn--sm" onClick={handleImport}>
          Import
        </button>
      </div>

      {/* Tabs */}
      <div className="sound-browser-tabs">
        <button
          className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse
        </button>
        <button
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites ({favorites.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
      </div>

      {/* Search & Filters */}
      {activeTab === 'browse' && (
        <div className="sound-browser-filters">
          <input
            type="text"
            className="search-input"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="filter-row">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="filter-select"
            >
              <option value="name">Name</option>
              <option value="date">Date Added</option>
              <option value="duration">Duration</option>
              <option value="bpm">BPM</option>
            </select>

            <select
              value={filterByType}
              onChange={(e) => setFilterByType(e.target.value as typeof filterByType)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="sample">Samples</option>
              <option value="loop">Loops</option>
              <option value="one-shots">One-Shots</option>
            </select>

            <div className="view-toggle">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'browse' && (
        <div className="sound-browser-categories">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
              <span className="category-label">{CATEGORY_LABELS[cat]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sound List */}
      <div className={`sound-list ${viewMode}`}>
        {displaySounds.length === 0 ? (
          <div className="empty-state">
            {activeTab === 'browse'
              ? 'No sounds found. Try adjusting your filters.'
              : activeTab === 'favorites'
              ? 'No favorites yet. Click the heart icon to add.'
              : 'No recently used sounds.'}
          </div>
        ) : (
          displaySounds.map((sound) => (
            <SoundItem
              key={sound.id}
              sound={sound}
              isPlaying={previewingSound === sound.id && isPreviewPlaying}
              onPreview={() => handlePreview(sound)}
              onSelect={() => handleSelect(sound)}
              onToggleFavorite={() => toggleFavorite(sound.id)}
              viewMode={viewMode}
            />
          ))
        )}
      </div>

      {/* Info */}
      <div className="sound-browser-info">
        <span>{displaySounds.length} sounds</span>
      </div>
    </div>
  );
}

// Sound item component
function SoundItem({
  sound,
  isPlaying,
  onPreview,
  onSelect,
  onToggleFavorite,
  viewMode,
}: {
  sound: SoundItem;
  isPlaying: boolean;
  onPreview: () => void;
  onSelect: () => void;
  onToggleFavorite: () => void;
  viewMode: 'grid' | 'list';
}) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`sound-item ${viewMode} ${isPlaying ? 'playing' : ''}`}
      onDoubleClick={onSelect}
    >
      {/* Preview Button */}
      <button className="preview-btn" onClick={onPreview}>
        {isPlaying ? '■' : '▶'}
      </button>

      {/* Info */}
      <div className="sound-info">
        <span className="sound-name">{sound.name}</span>
        <div className="sound-meta">
          {sound.bpm && <span className="bpm">{sound.bpm} BPM</span>}
          {sound.key && <span className="key">{sound.key}</span>}
          <span className="duration">{formatDuration(sound.duration)}</span>
        </div>
        {viewMode === 'list' && sound.tags.length > 0 && (
          <div className="sound-tags">
            {sound.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="sound-actions">
        <button
          className={`favorite-btn ${sound.favorite ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        >
          {sound.favorite ? '❤️' : '🤍'}
        </button>
        <button className="use-btn" onClick={onSelect}>
          Use
        </button>
      </div>
    </div>
  );
}
