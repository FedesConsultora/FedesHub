import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiX, FiSend, FiRefreshCw, FiPlay, FiPause } from 'react-icons/fi'
import WaveSurfer from 'wavesurfer.js'
import './AudioRecorderModal.scss'

const MAX_DURATION = 300 // 5 minutes in seconds

export default function AudioRecorderModal({ open, onClose, onSend }) {
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [duration, setDuration] = useState(0)
    const [audioBlob, setAudioBlob] = useState(null)

    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])
    const timerRef = useRef(null)
    const waveformRef = useRef(null)
    const wavesurferRef = useRef(null)
    const canvasRef = useRef(null)
    const animationRef = useRef(null)
    const analyserRef = useRef(null)
    const audioContextRef = useRef(null)

    // Initialize WaveSurfer for visualization when audio is ready
    useEffect(() => {
        if (!open) return
        if (audioBlob && waveformRef.current) {
            if (wavesurferRef.current) wavesurferRef.current.destroy()

            wavesurferRef.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#94a3b8',
                progressColor: '#3b82f6',
                cursorColor: '#3b82f6',
                barWidth: 3,
                barRadius: 3,
                responsive: true,
                height: 80,
                normalize: true,
                interact: true
            })

            const url = URL.createObjectURL(audioBlob)
            wavesurferRef.current.load(url)
        }
    }, [audioBlob, open])

    useEffect(() => {
        return () => {
            if (wavesurferRef.current) wavesurferRef.current.destroy()
            if (audioContextRef.current) audioContextRef.current.close().catch(e => { })
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [])

    const drawWaveform = () => {
        if (!canvasRef.current || !analyserRef.current) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const analyser = analyserRef.current
        analyser.fftSize = 64 // Use 64 for 32 bars
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw)
            analyser.getByteFrequencyData(dataArray)

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            const totalWidth = canvas.width
            const barWidth = (totalWidth / bufferLength)
            let x = 0

            for (let i = 0; i < bufferLength; i++) {
                // scale height to 80% of canvas
                const barHeight = (dataArray[i] / 255) * (canvas.height * 0.8)

                // Blue color
                ctx.fillStyle = '#3b82f6'

                // Centered vertically
                const y = (canvas.height - barHeight) / 2

                // Draw rounded bar
                ctx.beginPath()
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth - 2, Math.max(barHeight, 4), 4)
                } else {
                    ctx.rect(x, y, barWidth - 2, Math.max(barHeight, 4))
                }
                ctx.fill()

                x += barWidth
            }
        }

        draw()
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Setup audio context for visualization
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioContextRef.current.createMediaStreamSource(stream)
            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 2048
            source.connect(analyserRef.current)

            mediaRecorderRef.current = new MediaRecorder(stream)
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                setAudioBlob(blob)
                // Load the recording into WaveSurfer for preview  
                const url = URL.createObjectURL(blob)
                wavesurferRef.current.load(url)

                // Stop visualization
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current)
                }
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
            setIsPaused(false)
            setDuration(0)

            // Start waveform visualization
            drawWaveform()

            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= MAX_DURATION) {
                        stopRecording()
                        return MAX_DURATION
                    }
                    return prev + 1
                })
            }, 1000)
        } catch (err) {
            console.error('Error accessing microphone:', err)
            alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
        }
        clearInterval(timerRef.current)
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
        }
        setIsRecording(false)
        setIsPaused(false)
    }

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause()
            setIsPaused(true)
            clearInterval(timerRef.current)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume()
            setIsPaused(false)
            drawWaveform() // Resume visualization
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= MAX_DURATION) {
                        stopRecording()
                        return MAX_DURATION
                    }
                    return prev + 1
                })
            }, 1000)
        }
    }

    const handleReset = () => {
        setAudioBlob(null)
        setDuration(0)
        chunksRef.current = []
        if (wavesurferRef.current) wavesurferRef.current.empty()
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
    }

    const handleSend = () => {
        if (audioBlob) {
            const file = new File([audioBlob], `audio-message-${Date.now()}.webm`, { type: 'audio/webm' })
            onSend(file)
            handleClose()
        }
    }

    const handleClose = () => {
        stopRecording()
        handleReset()
        onClose()
    }

    const formatTime = (s) => {
        const mins = Math.floor(s / 60)
        const secs = s % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    if (!open) return null

    return createPortal(
        <div className="audio-recorder-overlay" onClick={handleClose}>
            <div className="audio-recorder-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={handleClose}><FiX /></button>

                <div className="modal-header">
                    <h3>Mensaje de Voz</h3>
                </div>

                <div className="waveform-container">
                    {!audioBlob && (
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={120}
                            style={{ width: '100%', height: '100%', display: isRecording ? 'block' : 'none' }}
                        />
                    )}
                    {/* El div para WaveSurfer debe estar presente si hay audioBlob */}
                    <div
                        ref={waveformRef}
                        style={{ width: '100%', display: audioBlob ? 'block' : 'none' }}
                    />

                    {!isRecording && !audioBlob && (
                        <div className="placeholder-text">Pulsa el botón para empezar a grabar</div>
                    )}
                </div>

                <div className="timer">
                    <span className={isRecording ? 'active' : ''}>{formatTime(duration)}</span>
                    <span className="limit">/ 5:00</span>
                </div>

                <div className="controls">
                    {!audioBlob ? (
                        <>
                            {!isRecording ? (
                                <button className="record-btn start" onClick={startRecording}>
                                    <div className="circle-red" />
                                </button>
                            ) : (
                                <div className="recording-actions">
                                    <button className="reset-btn" onClick={handleReset} title="Reiniciar">
                                        <FiRefreshCw />
                                    </button>
                                    {isPaused ? (
                                        <button className="record-btn resume" onClick={resumeRecording} title="Continuar">
                                            <FiPlay />
                                        </button>
                                    ) : (
                                        <button className="record-btn pause" onClick={pauseRecording} title="Pausar">
                                            <FiPause />
                                        </button>
                                    )}
                                    <button className="stop-btn" onClick={stopRecording} title="Parar">
                                        <div className="square-black" />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="after-recording">
                            <button className="reset-btn" onClick={handleReset} title="Reiniciar">
                                <FiRefreshCw />
                            </button>
                            <button className="preview-btn" onClick={() => wavesurferRef.current?.playPause()}>
                                <FiPlay /> / <FiPause />
                            </button>
                            <button className="send-btn" onClick={handleSend} title="Enviar">
                                <FiSend /> Enviar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
