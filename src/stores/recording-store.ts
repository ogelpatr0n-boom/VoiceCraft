import { create } from 'zustand';
import {
  multiTrackRecorder,
  type AudioInputDevice,
  type RecordingTrack,
  type MultiTrackRecordingResult
} from '../audio/recording/multi-track-recorder';

interface RecordingState {
  // Devices
  availableDevices: AudioInputDevice[];

  // Recording tracks (for multi-track)
  recordingTracks: RecordingTrack[];

  // Recording state
  isRecording: boolean;
  recordingStartTime: number | null;
  recordingDuration: number;

  // Settings
  countInEnabled: boolean;
  countInBars: number;
  monitoringEnabled: boolean;

  // Results
  lastResults: MultiTrackRecordingResult[];

  // Actions
  refreshDevices: () => Promise<void>;
  addRecordingTrack: (name: string, deviceId: string) => string;
  removeRecordingTrack: (trackId: string) => void;
  updateRecordingTrack: (trackId: string, updates: Partial<RecordingTrack>) => void;
  setTrackDevice: (trackId: string, deviceId: string) => void;
  setTrackArmed: (trackId: string, armed: boolean) => void;
  setTrackMonitoring: (trackId: string, monitoring: boolean) => Promise<void>;
  setTrackLevel: (trackId: string, level: number) => void;

  startRecording: (bpm: number) => Promise<void>;
  stopRecording: (bpm: number) => Promise<MultiTrackRecordingResult[]>;
  cancelRecording: () => void;

  setCountInEnabled: (enabled: boolean) => void;
  setCountInBars: (bars: number) => void;
  setMonitoringEnabled: (enabled: boolean) => void;
  setRecordingDuration: (duration: number) => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => {
  // Set up callbacks from the multi-track recorder
  multiTrackRecorder.setCallbacks({
    onLevel: (trackId, level) => {
      set(state => ({
        recordingTracks: state.recordingTracks.map(t =>
          t.id === trackId ? { ...t, level } : t
        ),
      }));
    },
    onDevicesChanged: (devices) => {
      set({ availableDevices: devices });
    },
    onRecordingComplete: (results) => {
      set({
        isRecording: false,
        recordingStartTime: null,
        lastResults: results,
      });
    },
    onError: (error) => {
      console.error('Recording error:', error);
      set({ isRecording: false, recordingStartTime: null });
    },
  });

  return {
    availableDevices: [],
    recordingTracks: [],
    isRecording: false,
    recordingStartTime: null,
    recordingDuration: 0,
    countInEnabled: true,
    countInBars: 1,
    monitoringEnabled: true,
    lastResults: [],

    refreshDevices: async () => {
      const devices = await multiTrackRecorder.refreshDevices();
      set({ availableDevices: devices });
    },

    addRecordingTrack: (name, deviceId) => {
      const trackId = multiTrackRecorder.addTrack(name, deviceId);
      const track = multiTrackRecorder.getTrack(trackId);
      if (track) {
        set(state => ({
          recordingTracks: [...state.recordingTracks, track],
        }));
      }
      return trackId;
    },

    removeRecordingTrack: (trackId) => {
      multiTrackRecorder.removeTrack(trackId);
      set(state => ({
        recordingTracks: state.recordingTracks.filter(t => t.id !== trackId),
      }));
    },

    updateRecordingTrack: (trackId, updates) => {
      set(state => ({
        recordingTracks: state.recordingTracks.map(t =>
          t.id === trackId ? { ...t, ...updates } : t
        ),
      }));
    },

    setTrackDevice: (trackId, deviceId) => {
      multiTrackRecorder.setTrackDevice(trackId, deviceId);
      set(state => ({
        recordingTracks: state.recordingTracks.map(t =>
          t.id === trackId ? { ...t, deviceId } : t
        ),
      }));
    },

    setTrackArmed: (trackId, armed) => {
      multiTrackRecorder.setTrackArmed(trackId, armed);
      set(state => ({
        recordingTracks: state.recordingTracks.map(t =>
          t.id === trackId ? { ...t, armed } : t
        ),
      }));
    },

    setTrackMonitoring: async (trackId, monitoring) => {
      if (monitoring) {
        await multiTrackRecorder.startTrackMonitoring(trackId);
      } else {
        multiTrackRecorder.stopTrackMonitoring(trackId);
      }
      set(state => ({
        recordingTracks: state.recordingTracks.map(t =>
          t.id === trackId ? { ...t, monitoring } : t
        ),
      }));
    },

    setTrackLevel: (trackId, level) => {
      set(state => ({
        recordingTracks: state.recordingTracks.map(t =>
          t.id === trackId ? { ...t, level } : t
        ),
      }));
    },

    startRecording: async (bpm) => {
      set({ isRecording: true, recordingStartTime: Date.now(), recordingDuration: 0 });
      await multiTrackRecorder.startRecording(bpm);
    },

    stopRecording: async (bpm) => {
      const results = await multiTrackRecorder.stopRecording(bpm);
      set({ isRecording: false, recordingStartTime: null, lastResults: results });
      return results;
    },

    cancelRecording: () => {
      multiTrackRecorder.cancelRecording();
      set({ isRecording: false, recordingStartTime: null, recordingDuration: 0 });
    },

    setCountInEnabled: (enabled) => set({ countInEnabled: enabled }),
    setCountInBars: (bars) => set({ countInBars: bars }),
    setMonitoringEnabled: (enabled) => set({ monitoringEnabled: enabled }),
    setRecordingDuration: (duration) => set({ recordingDuration: duration }),
  };
});
