#!/bin/sh

get_charging_status() {
    # Get charging status and wattage
    CHARGING_STATUS=$(pmset -g batt | grep 'AC Power')

    # Check if charging and get wattage info
    if [[ "$CHARGING_STATUS" != "" ]]; then
        # Get wattage of current charging
        wattage=$(system_profiler SPPowerDataType | grep -i "wattage" | grep -o '[0-9]\+')

        # Check if it's an official Apple charger (typically 87W, 96W, 140W, etc.)
        # Unofficial chargers are usually much lower (5W, 10W, 20W, etc.)
        if [[ "$wattage" -ge 60 ]]; then
            # High wattage - likely official Apple charger
            sketchybar --set charging icon=""
            # Play warning sound for unofficial charger
            afplay /System/Library/Sounds/Basso.aiff
        else
            # Low wattage - likely unofficial charger
            sketchybar --set charging icon="󰒲"
        fi
    else
        # Not charging
        sketchybar --set charging icon=""
    fi
}

get_charging_status
