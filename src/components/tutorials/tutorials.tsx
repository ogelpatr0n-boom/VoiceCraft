import type { Tutorial } from './TutorialSystem';

export const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of VoiceCraft in 5 minutes',
    category: 'getting-started',
    estimatedTime: '5 min',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to VoiceCraft!',
        content: (
          <div>
            <p>This quick tutorial will show you around the app.</p>
            <p>You'll learn how to:</p>
            <ul>
              <li>Navigate between views</li>
              <li>Create your first beat</li>
              <li>Record vocals</li>
              <li>Mix and export</li>
            </ul>
          </div>
        ),
        position: 'center',
      },
      {
        id: 'sidebar-intro',
        title: 'Navigation Sidebar',
        content: (
          <p>
            The sidebar lets you switch between different views. Each view has a
            specific purpose in your music creation workflow.
          </p>
        ),
        targetSelector: '.sidebar',
        position: 'right',
        highlightArea: true,
      },
      {
        id: 'live-view',
        title: 'Live View',
        content: (
          <p>
            <strong>Live</strong> is for real-time vocal processing with pitch
            correction. Perfect for performing or practicing.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(1)',
        position: 'right',
      },
      {
        id: 'instruments-view',
        title: 'Instruments View',
        content: (
          <p>
            <strong>Instruments</strong> is where you create beats and melodies
            using virtual drums, synths, and more.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(2)',
        position: 'right',
      },
      {
        id: 'session-view',
        title: 'Session View',
        content: (
          <p>
            <strong>Session</strong> shows all your tracks and clips. This is
            where you arrange your song and record vocals.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(3)',
        position: 'right',
      },
      {
        id: 'mixer-view',
        title: 'Mixer View',
        content: (
          <p>
            <strong>Mixer</strong> lets you balance volumes, add effects, and
            polish your final sound.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(4)',
        position: 'right',
      },
      {
        id: 'complete',
        title: 'You\'re Ready!',
        content: (
          <div>
            <p>You now know the basic layout of VoiceCraft.</p>
            <p>
              Try the "Create Your First Beat" tutorial next to start making
              music!
            </p>
          </div>
        ),
        position: 'center',
      },
    ],
  },
  {
    id: 'first-beat',
    name: 'Create Your First Beat',
    description: 'Make a simple drum pattern step by step',
    category: 'instruments',
    estimatedTime: '3 min',
    steps: [
      {
        id: 'intro',
        title: 'Let\'s Make a Beat!',
        content: (
          <p>
            In this tutorial, you'll create a simple drum pattern using the
            step sequencer. It's easier than you think!
          </p>
        ),
        position: 'center',
      },
      {
        id: 'go-to-instruments',
        title: 'Open Instruments View',
        content: (
          <p>
            First, click on <strong>Instruments</strong> in the sidebar to
            access the beat-making tools.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(2)',
        position: 'right',
        action: 'navigate',
        actionTarget: '/instruments',
      },
      {
        id: 'select-drums',
        title: 'Select Drums',
        content: (
          <p>
            Make sure the <strong>Drums</strong> tab is selected at the top.
            This gives you access to the drum machine.
          </p>
        ),
        targetSelector: '.instrument-tabs',
        position: 'bottom',
      },
      {
        id: 'understand-grid',
        title: 'The Step Sequencer',
        content: (
          <div>
            <p>This grid represents 16 steps (beats).</p>
            <p>Each row is a different drum sound:</p>
            <ul>
              <li>Top rows: Kicks and snares</li>
              <li>Middle rows: Hi-hats</li>
              <li>Bottom rows: Other percussion</li>
            </ul>
          </div>
        ),
        targetSelector: '.step-sequencer-grid',
        position: 'right',
      },
      {
        id: 'add-kick',
        title: 'Add a Kick Drum',
        content: (
          <p>
            Click on steps 1, 5, 9, and 13 on the <strong>Kick</strong> row to
            create a steady beat. These are the "downbeats".
          </p>
        ),
        targetSelector: '.step-sequencer-grid',
        position: 'right',
      },
      {
        id: 'add-snare',
        title: 'Add a Snare',
        content: (
          <p>
            Now click on steps 5 and 13 on the <strong>Snare</strong> row. The
            snare typically hits on beats 2 and 4.
          </p>
        ),
        targetSelector: '.step-sequencer-grid',
        position: 'right',
      },
      {
        id: 'add-hats',
        title: 'Add Hi-Hats',
        content: (
          <p>
            Add hi-hats on every other step (1, 3, 5, 7, 9, 11, 13, 15) to give
            your beat rhythm and movement.
          </p>
        ),
        targetSelector: '.step-sequencer-grid',
        position: 'right',
      },
      {
        id: 'start-loop',
        title: 'Start the Loop',
        content: (
          <p>
            Click the <strong>Loop</strong> button to hear your beat repeat.
            You can adjust the pattern while it plays!
          </p>
        ),
        targetSelector: '.loop-btn',
        position: 'bottom',
      },
      {
        id: 'complete',
        title: 'Congratulations!',
        content: (
          <div>
            <p>You just created your first beat!</p>
            <p>
              Experiment with different patterns. When you're happy, click "Save
              to Session" to use it in your song.
            </p>
          </div>
        ),
        position: 'center',
      },
    ],
  },
  {
    id: 'vocal-recording',
    name: 'Record Your First Vocal',
    description: 'Learn to record and layer vocals',
    category: 'recording',
    estimatedTime: '4 min',
    steps: [
      {
        id: 'intro',
        title: 'Recording Vocals',
        content: (
          <div>
            <p>VoiceCraft makes recording vocals easy.</p>
            <p>You'll learn how to:</p>
            <ul>
              <li>Set up your microphone</li>
              <li>Record in sync with your beat</li>
              <li>Layer multiple takes</li>
            </ul>
          </div>
        ),
        position: 'center',
      },
      {
        id: 'go-to-session',
        title: 'Open Session View',
        content: (
          <p>
            Click on <strong>Session</strong> to access the recording features.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(3)',
        position: 'right',
      },
      {
        id: 'find-recorder',
        title: 'Find the Recorder',
        content: (
          <p>
            Look for the <strong>Recording</strong> section. You can use "Quick
            Vocal" for simple recording or "Multi-Track" for advanced
            multi-input recording.
          </p>
        ),
        targetSelector: '.session-recording',
        position: 'top',
      },
      {
        id: 'mic-permission',
        title: 'Allow Microphone Access',
        content: (
          <p>
            Click <strong>Allow Microphone</strong> when prompted. VoiceCraft
            needs access to record your voice.
          </p>
        ),
        targetSelector: '.vocal-recorder',
        position: 'top',
      },
      {
        id: 'count-in',
        title: 'Set Count-In',
        content: (
          <p>
            Enable <strong>Count-in</strong> to get a few beats before
            recording starts. This helps you start in time with the music.
          </p>
        ),
        targetSelector: '.count-in-settings',
        position: 'bottom',
      },
      {
        id: 'record',
        title: 'Start Recording',
        content: (
          <p>
            Click <strong>Record</strong> and sing! The level meter shows your
            input volume. Aim for green - avoid red (too loud).
          </p>
        ),
        targetSelector: '.record-btn',
        position: 'bottom',
      },
      {
        id: 'complete',
        title: 'Great Job!',
        content: (
          <div>
            <p>Your vocal recording will appear as a clip on the Vocals track.</p>
            <p>
              Record multiple takes and keep the best parts. Use the Mixer to
              blend vocals with your instrumental.
            </p>
          </div>
        ),
        position: 'center',
      },
    ],
  },
  {
    id: 'pitch-correction',
    name: 'Using Pitch Correction',
    description: 'Apply auto-tune to your vocals in real-time',
    category: 'getting-started',
    estimatedTime: '4 min',
    steps: [
      {
        id: 'intro',
        title: 'Real-Time Pitch Correction',
        content: (
          <p>
            VoiceCraft includes professional pitch correction that works in
            real-time. Let's learn how to use it!
          </p>
        ),
        position: 'center',
      },
      {
        id: 'go-to-live',
        title: 'Open Live View',
        content: (
          <p>
            Click on <strong>Live</strong> to access the pitch correction
            controls.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(1)',
        position: 'right',
      },
      {
        id: 'enable-mic',
        title: 'Enable Your Microphone',
        content: (
          <p>
            Click the <strong>microphone button</strong> to start capturing
            your voice. You'll see the pitch display react to your singing.
          </p>
        ),
        targetSelector: '.mic-toggle-btn',
        position: 'bottom',
      },
      {
        id: 'select-key',
        title: 'Choose the Key',
        content: (
          <div>
            <p>
              Select the <strong>key</strong> of your song. The pitch corrector
              will snap your voice to notes in this key.
            </p>
            <p>
              <em>Tip: If unsure, try C major - it works for many songs!</em>
            </p>
          </div>
        ),
        targetSelector: '.key-selector',
        position: 'bottom',
      },
      {
        id: 'retune-speed',
        title: 'Adjust Retune Speed',
        content: (
          <div>
            <p>
              The <strong>Retune Speed</strong> controls how fast the
              correction happens:
            </p>
            <ul>
              <li><strong>Fast (0-20ms)</strong>: Robotic "T-Pain" effect</li>
              <li><strong>Medium (20-50ms)</strong>: Natural but polished</li>
              <li><strong>Slow (50-100ms)</strong>: Subtle, transparent</li>
            </ul>
          </div>
        ),
        targetSelector: '.retune-slider',
        position: 'bottom',
      },
      {
        id: 'humanize',
        title: 'Add Natural Feel',
        content: (
          <p>
            Use <strong>Humanize</strong> to keep some natural pitch variation.
            This prevents the robotic effect when you want a more organic sound.
          </p>
        ),
        targetSelector: '.humanize-slider',
        position: 'bottom',
      },
      {
        id: 'complete',
        title: 'You\'re All Set!',
        content: (
          <div>
            <p>Now sing and hear your pitch-corrected voice!</p>
            <p>
              Experiment with different settings to find your perfect sound.
              The pitch graph shows exactly what's happening in real-time.
            </p>
          </div>
        ),
        position: 'center',
      },
    ],
  },
  {
    id: 'mixing-basics',
    name: 'Mixing Basics',
    description: 'Learn to balance and polish your tracks',
    category: 'mixing',
    estimatedTime: '5 min',
    steps: [
      {
        id: 'intro',
        title: 'Introduction to Mixing',
        content: (
          <div>
            <p>
              Mixing is where you balance all your tracks to create a cohesive
              sound. Let's learn the essentials!
            </p>
          </div>
        ),
        position: 'center',
      },
      {
        id: 'go-to-mixer',
        title: 'Open the Mixer',
        content: (
          <p>
            Click on <strong>Mixer</strong> to see all your tracks as channel
            strips.
          </p>
        ),
        targetSelector: '.sidebar__item:nth-child(4)',
        position: 'right',
      },
      {
        id: 'faders',
        title: 'Volume Faders',
        content: (
          <div>
            <p>
              Each vertical slider is a <strong>volume fader</strong>. Drag them
              up or down to adjust how loud each track is.
            </p>
            <p>
              <em>Tip: Start with faders low and bring them up until
              balanced.</em>
            </p>
          </div>
        ),
        targetSelector: '.mixer-channel',
        position: 'right',
      },
      {
        id: 'pan',
        title: 'Pan Controls',
        content: (
          <p>
            The <strong>pan knob</strong> moves sounds left or right in the
            stereo field. Spread your tracks to create width and space.
          </p>
        ),
        targetSelector: '.pan-control',
        position: 'bottom',
      },
      {
        id: 'mute-solo',
        title: 'Mute and Solo',
        content: (
          <div>
            <p>
              <strong>M</strong> (Mute) silences a track temporarily.
            </p>
            <p>
              <strong>S</strong> (Solo) plays only that track, muting all
              others.
            </p>
            <p>Use these to focus on individual elements!</p>
          </div>
        ),
        targetSelector: '.mixer-buttons',
        position: 'bottom',
      },
      {
        id: 'master',
        title: 'Master Channel',
        content: (
          <p>
            The <strong>Master</strong> channel controls the overall output.
            Keep an eye on the meter - avoid the red zone to prevent distortion.
          </p>
        ),
        targetSelector: '.master-channel',
        position: 'left',
      },
      {
        id: 'complete',
        title: 'Mixing Complete!',
        content: (
          <div>
            <p>You've learned the basics of mixing!</p>
            <p>
              Next, try adding effects like EQ, compression, and reverb to each
              track for a professional polish.
            </p>
          </div>
        ),
        position: 'center',
      },
    ],
  },
];

export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find(t => t.id === id);
}

export function getTutorialsByCategory(category: Tutorial['category']): Tutorial[] {
  return TUTORIALS.filter(t => t.category === category);
}
