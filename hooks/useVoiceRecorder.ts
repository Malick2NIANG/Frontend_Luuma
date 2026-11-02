import { useCallback, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export interface VoiceRecording {
  uri: string;
  durationMs: number;
}

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const start = useCallback(async (): Promise<boolean> => {
    const permission = await requestRecordingPermissionsAsync();
    setHasPermission(permission.granted);
    if (!permission.granted) return false;

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    if (!recorder.isRecording) return null;

    const durationMs = state.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });

    if (!recorder.uri) return null;
    return { uri: recorder.uri, durationMs };
  }, [recorder, state.durationMillis]);

  const cancel = useCallback(async (): Promise<void> => {
    if (recorder.isRecording) {
      await recorder.stop();
    }
    await setAudioModeAsync({ allowsRecording: false });
  }, [recorder]);

  return {
    isRecording: state.isRecording,
    durationMs: state.durationMillis,
    hasPermission,
    start,
    stop,
    cancel,
  };
}
