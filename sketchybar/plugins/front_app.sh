#!/bin/sh

# Some events send additional information specific to the event in the $INFO
# variable. E.g. the front_app_switched event sends the name of the newly
# focused application in the $INFO variable:
# https://felixkratz.github.io/SketchyBar/config/events#events-and-scripting

if [ "$SENDER" = "front_app_switched" ]; then
  sketchybar --set "$NAME" label="$INFO"
fi

update_wifi_status() {
  local wifi_status=$(networksetup -getairportpower en0 | grep -i "off")

  if [ -n "$wifi_status" ]; then
    # WiFi is disconnected
    sketchybar --set chevron icon=""
  else
    # WiFi is connected
    sketchybar --set chevron icon="" # Replace with your preferred icon for connected status
  fi
}

update_wifi_status
