import { useState } from 'react';

type HelpSection = 'getting-started' | 'instruments' | 'recording' | 'arrangement' | 'piano-roll' | 'mixing' | 'export' | 'shortcuts';

interface TutorialStep {
  title: string;
  description: string;
  tip?: string;
}

const SECTIONS: Record<HelpSection, { title: string; icon: string; steps: TutorialStep[] }> = {
  'getting-started': {
    title: 'Getting Started',
    icon: '🚀',
    steps: [
      {
        title: 'Welcome to VoiceCraft Studio',
        description: 'VoiceCraft Studio is a complete music production DAW (Digital Audio Workstation) that runs in your browser. Create electronic beats, country songs, or any genre in between!',
        tip: 'Click on different sections in the sidebar to explore the various features.',
      },
      {
        title: 'Audio Permissions',
        description: 'When you first interact with any instrument or recording feature, your browser will ask for audio permissions. Click "Allow" to enable sound playback and microphone access.',
      },
      {
        title: 'MIDI Keyboard Support',
        description: 'If you have a MIDI keyboard connected, VoiceCraft will automatically detect it. You\'ll see "MIDI Connected" in the instruments panel.',
        tip: 'MIDI keyboards provide better velocity sensitivity than the on-screen keyboard.',
      },
    ],
  },
  instruments: {
    title: 'Virtual Instruments',
    icon: '🎹',
    steps: [
      {
        title: 'Adding Instruments',
        description: 'Go to the Instruments view and click any instrument button to add it. Instruments are organized into categories: Electronic/DJ for beats and synths, Country/Acoustic for traditional instruments, and Samples for realistic sounds.',
      },
      {
        title: 'Electronic Instruments',
        description: 'Synth - Polyphonic synthesizer with oscillators, filters, and ADSR envelope. Bass - TB-303 style acid bass for techno and house music. FM - Frequency modulation synthesis (DX7 style) for bells and electric pianos. Drums - 16-pad drum machine with 808-style sounds. Arp - Arpeggiator that plays patterns from held notes.',
        tip: 'For techno music, combine the Bass synth with the Drums and Arpeggiator.',
      },
      {
        title: 'Country/Acoustic Instruments',
        description: 'Guitar - Plucked strings including acoustic guitar, banjo, mandolin, ukulele, and harp. Fiddle - Bowed strings like violin and cello with realistic vibrato. Pedal Steel - Classic country pedal steel guitar sound.',
        tip: 'Layer the Fiddle with acoustic Guitar for authentic country arrangements.',
      },
      {
        title: 'Playing Instruments',
        description: 'Use the on-screen keyboard at the bottom to play notes. Click and hold for sustained notes, or tap for short notes. For drums, tap the 4x4 pad grid.',
        tip: 'Use your computer keyboard: A-L keys play notes, Z and X change octaves.',
      },
      {
        title: 'Adjusting Parameters',
        description: 'Each instrument has controls above the keyboard. Rotate knobs by clicking and dragging up/down. Select presets from the dropdown menu to quickly change sounds.',
      },
    ],
  },
  recording: {
    title: 'Recording',
    icon: '🎙️',
    steps: [
      {
        title: 'Recording Audio',
        description: 'Click the red Record button in the transport bar at the top. Your browser will ask for microphone permission. Sing or play an instrument into your microphone.',
        tip: 'Wear headphones while recording to prevent feedback from your speakers.',
      },
      {
        title: 'Stop Recording',
        description: 'Click the Record button again or click Stop to finish. Your recording will automatically be added to an audio track in the arrangement view.',
      },
      {
        title: 'Pitch Correction',
        description: 'Go to the Live view to apply real-time pitch correction to your vocals. Adjust the correction strength to taste - 100% for robotic effects, 50-70% for natural tuning.',
      },
    ],
  },
  arrangement: {
    title: 'Arrangement Timeline',
    icon: '🎼',
    steps: [
      {
        title: 'The Timeline',
        description: 'The Arrange view shows your song as a horizontal timeline. Tracks are stacked vertically, and clips (audio or MIDI) appear as colored blocks.',
      },
      {
        title: 'Adding Tracks',
        description: 'Click the + button in the track list to add a new track. Choose between Audio (for recordings) or MIDI (for virtual instruments).',
      },
      {
        title: 'Working with Clips',
        description: 'Drag clips to move them in time. Resize clips by dragging their edges. Double-click a MIDI clip to open it in the Piano Roll editor.',
        tip: 'Use the grid snap to align clips perfectly to the beat.',
      },
      {
        title: 'Looping',
        description: 'Click the Loop button (↺) in the transport to enable looping. Drag the loop region markers in the timeline ruler to set the loop boundaries.',
      },
    ],
  },
  'piano-roll': {
    title: 'Piano Roll Editor',
    icon: '🎵',
    steps: [
      {
        title: 'Opening the Piano Roll',
        description: 'Go to the Piano Roll view from the sidebar. Select a MIDI track and clip to edit, or create new notes directly.',
      },
      {
        title: 'Drawing Notes',
        description: 'Select the Draw tool (pencil icon) and click on the grid to place notes. Drag to create longer notes. The vertical position determines pitch (shown on the piano keys on the left).',
      },
      {
        title: 'Editing Notes',
        description: 'Select tool: Click notes to select them, then drag to move. Resize notes by dragging their edges. Erase tool: Click notes to delete them.',
        tip: 'Hold Shift to select multiple notes at once.',
      },
      {
        title: 'Velocity',
        description: 'The velocity lane at the bottom shows how hard each note is played. Click and drag velocity bars to adjust - higher velocity means louder notes.',
      },
      {
        title: 'Quantization',
        description: 'Use the grid snap setting to align notes to specific beat divisions. 1/16 is common for detailed work, 1/4 for simpler melodies.',
      },
    ],
  },
  mixing: {
    title: 'Mixing',
    icon: '🎛️',
    steps: [
      {
        title: 'The Mixer',
        description: 'Go to the Mixer view to see all your tracks as channel strips. Each strip has a volume fader, pan knob, mute and solo buttons.',
      },
      {
        title: 'Volume Balancing',
        description: 'Drag the faders up or down to adjust volume levels. The goal is to have all tracks audible without any being too loud or quiet.',
        tip: 'Start with all faders at 0dB, then reduce any tracks that are too loud.',
      },
      {
        title: 'Panning',
        description: 'Use the pan knob to position sounds in the stereo field. Center (12 o\'clock) plays equally from both speakers. Left and right create width.',
        tip: 'Pan similar instruments to opposite sides to create space (e.g., two guitars left and right).',
      },
      {
        title: 'Solo and Mute',
        description: 'Click S to solo a track (only hear that track). Click M to mute a track (silence it). Use these to focus on specific parts while mixing.',
      },
      {
        title: 'Effects',
        description: 'Each track can have effects like reverb, delay, and EQ. Click the FX button on a track to open the effects panel and add processing.',
      },
    ],
  },
  export: {
    title: 'Exporting',
    icon: '💾',
    steps: [
      {
        title: 'Render Your Song',
        description: 'When your song is complete, go to the Export view. Choose your format (WAV for highest quality, MP3 for smaller file size).',
      },
      {
        title: 'Export Settings',
        description: 'WAV: Uncompressed audio, best for further editing or mastering. MP3: Compressed audio, good for sharing online.',
        tip: 'Always keep a WAV copy as your master before creating MP3s.',
      },
      {
        title: 'Download',
        description: 'Click Export to render your song. The process may take a moment depending on song length. Your file will download automatically when ready.',
      },
    ],
  },
  shortcuts: {
    title: 'Keyboard Shortcuts',
    icon: '⌨️',
    steps: [
      {
        title: 'Transport Controls',
        description: 'Space: Play/Pause, Enter: Stop and return to start, R: Toggle recording, L: Toggle loop',
      },
      {
        title: 'Navigation',
        description: 'Arrow keys: Navigate timeline, Home: Go to start, End: Go to end, Scroll wheel: Zoom in/out',
      },
      {
        title: 'Editing',
        description: 'Ctrl/Cmd + Z: Undo, Ctrl/Cmd + Shift + Z: Redo, Ctrl/Cmd + C: Copy, Ctrl/Cmd + V: Paste, Delete: Delete selected',
      },
      {
        title: 'Piano Keys',
        description: 'A S D F G H J K L: White keys (C to B), W E T Y U O P: Black keys (sharps/flats), Z: Octave down, X: Octave up',
      },
    ],
  },
};

export function HelpView() {
  const [activeSection, setActiveSection] = useState<HelpSection>('getting-started');
  const section = SECTIONS[activeSection];

  return (
    <div className="help-view">
      <div className="help-header">
        <h1>VoiceCraft Studio Help</h1>
        <p>Learn how to create music with VoiceCraft Studio</p>
      </div>

      <div className="help-content">
        <nav className="help-nav">
          {(Object.keys(SECTIONS) as HelpSection[]).map((key) => (
            <button
              key={key}
              className={`help-nav-item ${activeSection === key ? 'active' : ''}`}
              onClick={() => setActiveSection(key)}
            >
              <span className="help-nav-icon">{SECTIONS[key].icon}</span>
              <span className="help-nav-label">{SECTIONS[key].title}</span>
            </button>
          ))}
        </nav>

        <div className="help-main">
          <div className="help-section-header">
            <span className="help-section-icon">{section.icon}</span>
            <h2>{section.title}</h2>
          </div>

          <div className="help-steps">
            {section.steps.map((step, index) => (
              <div key={index} className="help-step">
                <div className="help-step-number">{index + 1}</div>
                <div className="help-step-content">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {step.tip && (
                    <div className="help-tip">
                      <span className="tip-icon">💡</span>
                      <span>{step.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="help-footer">
        <div className="quick-tips">
          <h3>Quick Tips</h3>
          <ul>
            <li>Save your work frequently using Ctrl/Cmd + S</li>
            <li>Use headphones for the best mixing accuracy</li>
            <li>Start with a template to learn the workflow</li>
            <li>Less is more - don't over-process your tracks</li>
          </ul>
        </div>
        <div className="support-info">
          <h3>Need More Help?</h3>
          <p>Report issues or request features at:</p>
          <a href="https://github.com/anthropics/claude-code/issues" target="_blank" rel="noopener noreferrer">
            GitHub Issues
          </a>
        </div>
      </div>
    </div>
  );
}
