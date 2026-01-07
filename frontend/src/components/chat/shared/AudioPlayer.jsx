import React, { useEffect, useRef, useState } from 'react'
import { FiPlay, FiPause } from 'react-icons/fi'
import WaveSurfer from 'wavesurfer.js'
import './AudioPlayer.scss'

export default function AudioPlayer({ url, duration }) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [totalDuration, setTotalDuration] = useState(duration || 0)

    const waveformRef = useRef(null)
    const wavesurferRef = useRef(null)

    useEffect(() => {
        if (waveformRef.current) {
            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#94a3b8',
                progressColor: '#60a5fa',
                cursorColor: '#3b82f6',
                barWidth: 3,
                barRadius: 3,
                responsive: true,
                height: 30,
                normalize: true,
            })

            wavesurferRef.current.load(url)

            wavesurferRef.current.on('play', () => setIsPlaying(true))
            wavesurferRef.current.on('pause', () => setIsPlaying(false))
            wavesurferRef.current.on('timeupdate', (time) => setCurrentTime(time))
            wavesurferRef.current.on('ready', (dur) => setTotalDuration(dur))

            return () => {
                if (wavesurferRef.current) {
                    wavesurferRef.current.destroy()
                }
            }
        }
    }, [url])

    const togglePlay = () => {
        if (wavesurferRef.current) {
            wavesurferRef.current.playPause()
        }
    }

    const formatTime = (s) => {
        const mins = Math.floor(s / 60)
        const secs = Math.floor(s % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="audio-player">
            <button className="play-pause-btn" onClick={togglePlay}>
                {isPlaying ? <FiPause /> : <FiPlay />}
            </button>

            <div className="waveform-wrap">
                <div ref={waveformRef} className="waveform" />
            </div>

            <div className="time-info">
                <span className="current">{formatTime(currentTime)}</span>
                <span className="sep">/</span>
                <span className="total">{formatTime(totalDuration)}</span>
            </div>
        </div>
    )
}
