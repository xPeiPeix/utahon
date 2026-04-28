import { isAzureConfigured } from "@/lib/azure-tts";
import { VoicePickerClient } from "./voice-picker-client";

export function VoicePicker() {
  return <VoicePickerClient azureConfigured={isAzureConfigured()} />;
}
