#!/bin/bash

update_audio() {
  CURRENT_DEVICE=$(SwitchAudioSource -c)
  
  case "$CURRENT_DEVICE" in
    *"MacBook Pro Speakers"*)
      ICON="󰓃"
      ;;
    *"AirPods"*)
      ICON=""
      ;;
    *"USB"*)
      ICON=""
      ;;
    *"DisplayPort"* | *"HDMI"*)
      ICON="󰽟"
      ;;
    *)
      ICON=""
      ;;
  esac

  sketchybar --set audio icon="$ICON"
}

update_audio