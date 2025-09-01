#!/bin/bash

INTERFACE=$(route get default 2>/dev/null | awk '/interface:/ {print $2}')

get_bandwidth_usage() {
    RX_PREV=$(netstat -ib | awk -v iface="$INTERFACE" '$1 == iface {print $7; exit}')
    TX_PREV=$(netstat -ib | awk -v iface="$INTERFACE" '$1 == iface {print $10; exit}')
    sleep 1
    RX_NEXT=$(netstat -ib | awk -v iface="$INTERFACE" '$1 == iface {print $7; exit}')
    TX_NEXT=$(netstat -ib | awk -v iface="$INTERFACE" '$1 == iface {print $10; exit}')

    RX_BITS=$(((RX_NEXT - RX_PREV) * 8))
    TX_BITS=$(((TX_NEXT - TX_PREV) * 8))

    format_speed() {
        local speed=$1
        if [ "$speed" -lt 1000 ]; then
            printf "0 Kbps"
        elif [ "$speed" -lt 1000000 ]; then
            printf "%d Kbps" "$((speed / 1000))"
        elif [ "$speed" -lt 1000000000 ]; then
            printf "%d Mbps" "$((speed / 1000000))"
        else
            printf "%d Gbps" "$((speed / 1000000000))"
        fi
    }

    if [ "$RX_BITS" -ge "$TX_BITS" ]; then
        RX_SPEED=$(format_speed "$RX_BITS")
        sketchybar --add item bandwidth right \
            --set bandwidth update_freq=1 icon= label="$RX_SPEED"
    else
        TX_SPEED=$(format_speed "$TX_BITS")
        sketchybar --add item bandwidth right \
            --set bandwidth update_freq=1 icon= label="$TX_SPEED"
    fi

    # sketchybar --add item upload_bandwidth right --set upload_bandwidth label.font="FiraCode Nerd Font:Normal:8.0" label=" $TX_SPEED"

    # sketchybar --add item download_bandwidth right --set download_bandwidth label.font="FiraCode Nerd Font:Normal:8.0" background.padding_right=-70 label=" $RX_SPEED"

    # # Position Them Vertically
    # sketchybar --set upload_bandwidth y_offset=6

    # sketchybar --set download_bandwidth y_offset=-3

}

get_bandwidth_usage
