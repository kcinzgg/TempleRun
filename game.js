import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Audio Manager Class
class AudioManager {
    constructor() {
        this.sounds = {};
        this.backgroundMusic = null;
        this.isMuted = false;
        this.volume = 1.0;
        this.userInteracted = false; // 改回false，正确处理用户交互
        this.pendingBackgroundMusic = false;
        this.audioStarted = false; // 添加音频启动标志
        this.gameRef = null; // 游戏实例引用，用于重新设置开始时间
        
        // 创建音频上下文
        this.audioContext = null;
        this._initAudioContext();
        this._setupUserInteractionDetection();
    }

    _setupUserInteractionDetection() {
        const startAudio = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('📱 用户交互检测到，启动音频系统');
                
                // 🎮 重要：在用户第一次交互时重新设置游戏开始时间
                if (this.gameRef) {
                    this.gameRef.gameStartTime = Date.now();
                    console.log('🎮 用户开始操作，重新设置游戏开始时间');
                }
                
                // 移动端音频上下文恢复
                this._resumeAudioContextForMobile();
                
                // 移除所有事件监听器
                document.removeEventListener('click', startAudio);
                document.removeEventListener('keydown', startAudio);
                document.removeEventListener('touchstart', startAudio);
                document.removeEventListener('touchend', startAudio);
                document.removeEventListener('mousedown', startAudio);
            }
        };

        // 监听多种用户交互事件（特别针对iOS优化）
        document.addEventListener('click', startAudio, { once: true });
        document.addEventListener('keydown', startAudio, { once: true });
        document.addEventListener('touchstart', startAudio, { once: true });
        document.addEventListener('touchend', startAudio, { once: true });
        document.addEventListener('mousedown', startAudio, { once: true });
        
        // iOS特殊处理：额外的事件监听
        if (this._isIOSDevice()) {
            document.addEventListener('gesturestart', startAudio, { once: true });
            document.addEventListener('gesturechange', startAudio, { once: true });
            window.addEventListener('orientationchange', startAudio, { once: true });
            console.log('🍎 iOS特殊音频事件监听已设置');
        }
        
        console.log('📱 移动端音频交互检测已设置');
    }

    _resumeAudioContextForMobile() {
        console.log('🍎 iOS音频恢复开始，当前状态:', this.audioContext?.state);
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            // iOS特殊处理：多次尝试恢复
            this._tryResumeAudioContext(0);
        } else if (this.audioContext && this.audioContext.state === 'running') {
            console.log('🔊 AudioContext已在运行状态');
            this.audioStarted = true;
            this._startAudioSafely();
        } else {
            console.log('🔄 AudioContext未初始化，重新创建');
            this._fallbackAudioInit();
        }
    }

    _tryResumeAudioContext(attempt) {
        if (attempt >= 3) {
            console.warn('❌ iOS AudioContext恢复失败，尝试fallback');
            this._fallbackAudioInit();
            return;
        }

        console.log(`🍎 iOS AudioContext恢复尝试 ${attempt + 1}/3`);
        
        this.audioContext.resume().then(() => {
            console.log('🔊 iOS AudioContext恢复成功');
            this.audioStarted = true;
            
            // iOS特殊处理：立即创建测试音频
            this._createiOSTestAudio();
            
            // 延迟启动背景音乐，确保AudioContext完全激活
            setTimeout(() => {
                this._startAudioSafely();
            }, 200);
            
        }).catch(e => {
            console.warn(`❌ iOS AudioContext恢复失败 (尝试 ${attempt + 1}):`, e);
            setTimeout(() => {
                this._tryResumeAudioContext(attempt + 1);
            }, 100);
        });
    }

    _startAudioSafely() {
        if (this.backgroundMusic && !this.isMuted && this.audioStarted) {
            try {
                this.playBackgroundMusic();
            } catch (e) {
                console.warn('背景音乐播放失败:', e);
            }
        }
    }

    _createiOSTestAudio() {
        try {
            // iOS特殊处理：创建多个测试音频确保AudioContext激活
            for (let i = 0; i < 3; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // iOS需要非零音量才能激活，但设置得很小
                gainNode.gain.value = 0.001; 
                oscillator.frequency.value = 440 + i * 100;
                oscillator.type = 'sine';
                
                const startTime = this.audioContext.currentTime + i * 0.05;
                oscillator.start(startTime);
                oscillator.stop(startTime + 0.05);
            }
            
            console.log('🍎 iOS测试音频已创建（微小音量）');
        } catch (e) {
            console.warn('iOS测试音频创建失败:', e);
        }
    }

    _createMobileSilentTone() {
        // iOS使用专门的测试音频
        if (this._isIOSDevice()) {
            this._createiOSTestAudio();
        } else {
            // 其他移动端使用静音测试
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                gainNode.gain.value = 0; // 静音
                oscillator.frequency.value = 440;
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
                
                console.log('🔇 移动端静音测试音频已创建');
            } catch (e) {
                console.warn('移动端静音测试音频创建失败:', e);
            }
        }
    }

    _isIOSDevice() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    _fallbackAudioInit() {
        try {
            console.log('🔄 尝试重新初始化AudioContext（移动端fallback）');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioStarted = true;
            
            if (this.backgroundMusic && !this.isMuted) {
                setTimeout(() => {
                    this.playBackgroundMusic();
                }, 200);
            }
        } catch (e) {
            console.error('❌ AudioContext fallback初始化失败:', e);
        }
    }

    _initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext创建完成，状态:', this.audioContext.state);
            
            // iOS特殊处理：监听状态变化
            if (this._isIOSDevice()) {
                this.audioContext.addEventListener('statechange', () => {
                    console.log('🍎 iOS AudioContext状态变化:', this.audioContext.state);
                    if (this.audioContext.state === 'running' && !this.audioStarted) {
                        this.audioStarted = true;
                        console.log('🍎 iOS AudioContext现在可用');
                    }
                });
            }
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }



    // 加载音频文件
    loadSound(name, url, isMusic = false) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        
        if (isMusic) {
            audio.loop = true;
            audio.volume = 0.3; // 背景音乐音量较低
            this.backgroundMusic = audio;
        } else {
            audio.volume = 0.7; // 音效音量
        }
        
        this.sounds[name] = audio;
        
        // 处理加载错误
        audio.addEventListener('error', () => {
            console.warn(`Failed to load audio: ${name} from ${url}`);
        });
        
        return audio;
    }

    // 播放音效
    playSound(name, volume = null) {
        if (this.isMuted || !this.userInteracted) return;
        
        // iOS特殊检查
        if (this._isIOSDevice() && this.audioContext && this.audioContext.state === 'suspended') {
            console.log('🍎 iOS AudioContext仍处于挂起状态，尝试恢复后播放音效');
            this.audioContext.resume().then(() => {
                this._playSound(name, volume);
            }).catch(e => {
                console.warn('iOS音效播放失败:', e);
            });
            return;
        }
        
        this._playSound(name, volume);
    }

    _playSound(name, volume = null) {
        const sound = this.sounds[name];
        if (!sound) {
            console.warn(`Sound '${name}' not found`);
            return;
        }
        
        try {
            // 检查是否是程序化音效（有自定义play方法）
            if (typeof sound.play === 'function') {
                if (sound.currentTime !== undefined) {
                    // HTML Audio对象
                    sound.currentTime = 0;
                    if (volume !== null) {
                        sound.volume = volume * this.volume;
                    }
                    sound.play().catch(e => {
                        console.warn(`Failed to play sound '${name}':`, e);
                    });
                } else {
                    // 程序化音效对象
                    sound.play();
                }
            }
        } catch (e) {
            console.warn(`Error playing sound '${name}':`, e);
        }
    }

    // 播放背景音乐
    playBackgroundMusic() {
        if (this.isMuted || !this.backgroundMusic || !this.userInteracted) return;
        
        try {
            // 检查是否是HTML Audio对象还是程序化音乐对象
            if (this.backgroundMusic.play && typeof this.backgroundMusic.play === 'function') {
                const playResult = this.backgroundMusic.play();
                // 只有HTML Audio对象的play()方法返回Promise
                if (playResult && typeof playResult.catch === 'function') {
                    playResult.catch(e => {
                        console.warn('Failed to play background music:', e);
                    });
                }
            }
        } catch (e) {
            console.warn('Error playing background music:', e);
        }
    }

    // 停止背景音乐
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            if (this.backgroundMusic.pause) {
                this.backgroundMusic.pause();
            }
            // 对于HTML Audio对象
            if (this.backgroundMusic.currentTime !== undefined) {
                this.backgroundMusic.currentTime = 0;
            }
        }
    }

    // 暂停/继续背景音乐
    toggleBackgroundMusic() {
        if (!this.backgroundMusic) return;
        
        if (this.backgroundMusic.paused) {
            this.playBackgroundMusic();
        } else {
            if (this.backgroundMusic.pause) {
                this.backgroundMusic.pause();
            }
        }
    }

    // 设置音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // 更新所有音频的音量
        Object.values(this.sounds).forEach(sound => {
            if (sound === this.backgroundMusic) {
                sound.volume = 0.3 * this.volume;
            } else {
                sound.volume = 0.7 * this.volume;
            }
        });
    }

    // 静音/取消静音
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.stopBackgroundMusic();
        } else {
            this.playBackgroundMusic();
        }
    }

    // 初始化所有游戏音频
    initGameAudio() {
        // 主要使用程序化音效，避免依赖外部音频文件
        this._generateSoundEffects();
        
        // 尝试加载MP3背景音乐文件
        this._loadBackgroundMusicFiles();
        
        // 立即尝试启动音频系统
        setTimeout(() => {
            this._attemptImmediateAudioStart();
        }, 100);
    }

    _attemptImmediateAudioStart() {
        // 不再尝试立即启动音频，等待用户交互
        console.log('音频系统已准备就绪，等待用户交互...');
    }

    // 生成程序化音效（当没有音频文件时的备选方案）
    _generateSoundEffects() {
        if (!this.audioContext) return;
        
        // 创建简单的音效
        this._createBeepSound('move', 200, 0.1);      // 移动音效
        this._createBeepSound('coin', 800, 0.2);      // 金币音效
        this._createBeepSound('collision', 100, 0.5); // 碰撞音效
        this._createBeepSound('gameover', 150, 1.0);  // 游戏结束音效
        this._createBeepSound('jump', 400, 0.15);     // 跳跃音效
    }

    _createBeepSound(name, frequency, duration) {
        if (!this.audioContext) return;
        
        this.sounds[name] = {
            play: () => {
                if (this.isMuted || !this.audioContext || !this.userInteracted) return;
                
                // 确保音频上下文处于运行状态
                if (this.audioContext.state === 'suspended') {
                    return; // 如果仍然挂起，直接返回
                }
                
                try {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.frequency.value = frequency;
                    oscillator.type = 'square';
                    
                    const now = this.audioContext.currentTime;
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(0.3 * this.volume, now + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
                    
                    oscillator.start(now);
                    oscillator.stop(now + duration);
                } catch (e) {
                    console.warn(`Error creating beep sound '${name}':`, e);
                }
            }
        };
    }

    // 加载MP3背景音乐文件
    _loadBackgroundMusicFiles() {
        // 使用单一的背景音乐文件
        this.musicFile = {
            path: './bgm2.mp3',
            name: '背景音乐'
        };

        this.loadedMusic = null;
        
        // 加载背景音乐文件
        this._loadSingleMusicFile();

        // 如果没有找到MP3文件，回退到程序化音乐
        setTimeout(() => {
            if (!this.loadedMusic) {
                console.log('🎵 未找到bgm.mp3文件，使用程序化音');
                this._createProgrammaticMusic();
            }
        }, 2000);
    }

    // 加载单一背景音乐文件
    _loadSingleMusicFile() {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.loop = true;
        audio.volume = 0.6; // 稍微提高音量
        
        audio.addEventListener('canplaythrough', () => {
            this.loadedMusic = audio;
            console.log(`🎵 成功加载: ${this.musicFile.name} (${this.musicFile.path})`);
            
            // 设置为背景音乐
            this._setBackgroundMusic();
        });
        
        audio.addEventListener('error', (e) => {
            console.warn(`⚠️ 无法加载音乐文件: ${this.musicFile.path}`, e);
        });
        
        // 设置音频源
        audio.src = this.musicFile.path;
    }

    // 设置背景音乐
    _setBackgroundMusic() {
        if (!this.loadedMusic) return;
        
        this.backgroundMusic = this.loadedMusic;
        
        // 保存原始的play和pause方法
        const originalPlay = this.backgroundMusic.play.bind(this.backgroundMusic);
        const originalPause = this.backgroundMusic.pause.bind(this.backgroundMusic);
        
        // 重写play方法以添加用户交互检查
        this.backgroundMusic.play = () => {
            if (this.isMuted || !this.userInteracted) {
                return Promise.resolve();
            }
            
            return originalPlay().catch(e => {
                console.warn('背景音乐播放失败:', e);
                return Promise.resolve();
            });
        };
        
        // 重写pause方法
        this.backgroundMusic.pause = () => {
            return originalPause();
        };
    }

    // 根据游戏速度调整音乐播放速度
    selectMusicBySpeed(speedRatio) {
        if (!this.loadedMusic) return;
        
        // 温和的音乐变速：移动速度每提升10%，音乐速度只提升1%
        // speedRatio - 1 = 游戏速度相对于初始速度的增量（比如1.5倍速时增量是0.5）
        // 将这个增量除以10，得到音乐速度的增量
        const musicSpeedIncrease = (speedRatio - 1) * 0.1; // 10%游戏速度 = 1%音乐速度
        
        // 基础音乐播放速度为1.0（正常速度）
        const basePlaybackRate = 1.0;
        const minPlaybackRate = 0.95;  // 最慢播放速度（稍微慢一点）
        const maxPlaybackRate = 1.15;  // 最快播放速度（稍微快一点）
        
        // 计算最终的播放速度
        const playbackRate = Math.min(
            Math.max(minPlaybackRate, basePlaybackRate + musicSpeedIncrease),
            maxPlaybackRate
        );
        
        // 调整音乐播放速度
        if (this.backgroundMusic && this.backgroundMusic.playbackRate !== undefined) {
            this.backgroundMusic.playbackRate = playbackRate;
            
            // 音量保持相对稳定，只有很轻微的变化
            const volumeMultiplier = 0.6 + (speedRatio - 1) * 0.05; // 更温和的音量变化
            this.backgroundMusic.volume = Math.min(Math.max(volumeMultiplier, 0.55), 0.7);
        }
    }

    // 回退到程序化音乐（如果没有MP3文件）
    _createProgrammaticMusic() {
        this.backgroundMusic = {
            isPlaying: false,
            currentLoop: null,
            gameRef: null,
            
            play: () => {
                if (this.isMuted || !this.audioContext || !this.userInteracted || this.backgroundMusic.isPlaying) return;
                
                this.backgroundMusic.isPlaying = true;
                this._playMusicLoop();
            },
            
            pause: () => {
                this.backgroundMusic.isPlaying = false;
                if (this.backgroundMusic.currentLoop) {
                    clearTimeout(this.backgroundMusic.currentLoop);
                    this.backgroundMusic.currentLoop = null;
                }
            },
            
            get paused() {
                return !this.backgroundMusic.isPlaying;
            }
        };
    }

    // 播放音乐循环 - 基于乐谱的音乐生成系统
    _playMusicLoop() {
        if (!this.backgroundMusic.isPlaying || this.isMuted || !this.audioContext || !this.userInteracted) return;

        // 确保音频上下文处于运行状态
        if (this.audioContext.state === 'suspended') {
            console.log('音频上下文仍然挂起，等待用户交互');
            return;
        }

        // 🎼 完整的音乐乐谱系统
        const musicSheet = this._createMusicSheet();
        
        let currentMeasure = 0;
        let currentBeat = 0;
        let globalBeatCount = 0;
        
        let currentSong = null;
        let currentNoteIndex = 0;
        
        const playNextNote = () => {
            if (!this.backgroundMusic.isPlaying) return;

            try {
                // 获取当前游戏速度
                const game = this.backgroundMusic.gameRef;
                const speedRatio = game ? (game.runSpeed / game.initialRunSpeed) : 1;
                
                // 根据速度选择歌曲
                const selectedSong = this._selectSong(speedRatio);
                
                // 如果歌曲改变，重置播放状态
                if (currentSong !== selectedSong) {
                    currentSong = selectedSong;
                    currentMeasure = 0;
                    currentNoteIndex = 0;
                    console.log(`🎵 切换到: ${musicSheet[currentSong].title} - ${musicSheet[currentSong].composer}`);
                }
                
                const songData = musicSheet[currentSong];
                const baseTempo = songData.tempo || 120;
                const actualTempo = baseTempo * Math.min(speedRatio, 2.0); // 最高2倍速
                const beatDuration = 60 / actualTempo; // 每拍的秒数
                
                // 获取当前小节
                const measure = songData.measures[currentMeasure % songData.measures.length];
                const now = this.audioContext.currentTime;
                
                // 🎵 播放当前小节的所有音符和和声
                this._playMeasureFromRealSheet(measure, now, beatDuration, speedRatio);
                
                // 计算小节持续时间（根据拍号）
                const timeSignature = songData.timeSignature;
                const measureDuration = beatDuration * timeSignature[0]; // 每小节的拍数
                
                // 前进到下一小节
                currentMeasure++;
                globalBeatCount += timeSignature[0];
                
                // 安排下一小节
                this.backgroundMusic.currentLoop = setTimeout(() => {
                    playNextNote();
                }, measureDuration * 1000);
                
            } catch (e) {
                console.warn('Error playing background music:', e);
                this.backgroundMusic.isPlaying = false;
            }
        };

        playNextNote();
    }

    // 🎼 创建真实歌曲乐谱库
    _createMusicSheet() {
        return {
            // 生日快乐歌 - Happy Birthday
            happyBirthday: {
                title: "生日快乐歌",
                composer: "Patty Hill & Mildred Hill",
                timeSignature: [3, 4], // 3/4拍 (华尔兹拍)
                keySignature: 'C', // C大调
                tempo: 120,
                measures: [
                    // 第1小节: "Happy Birth-" 
                    {
                        notes: [
                            { note: 'C4', duration: 0.5, beat: 1 },      // Hap-
                            { note: 'C4', duration: 0.5, beat: 1.5 },    // py
                            { note: 'D4', duration: 1, beat: 2 },        // Birth-
                            { note: 'C4', duration: 1, beat: 3 }         // day
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 3, beat: 1 } // C和弦
                        ]
                    },
                    // 第2小节: "day to"
                    {
                        notes: [
                            { note: 'F4', duration: 1, beat: 1 },        // to
                            { note: 'E4', duration: 2, beat: 2 }         // you
                        ],
                        harmony: [
                            { notes: ['F3', 'A3', 'C4'], duration: 1, beat: 1 }, // F和弦
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 2 }  // C和弦
                        ]
                    },
                    // 第3小节: "Happy Birth-"
                    {
                        notes: [
                            { note: 'C4', duration: 0.5, beat: 1 },      // Hap-
                            { note: 'C4', duration: 0.5, beat: 1.5 },    // py
                            { note: 'D4', duration: 1, beat: 2 },        // Birth-
                            { note: 'C4', duration: 1, beat: 3 }         // day
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 3, beat: 1 } // C和弦
                        ]
                    },
                    // 第4小节: "day to"
                    {
                        notes: [
                            { note: 'G4', duration: 1, beat: 1 },        // to
                            { note: 'F4', duration: 2, beat: 2 }         // you
                        ],
                        harmony: [
                            { notes: ['G3', 'B3', 'D4'], duration: 1, beat: 1 }, // G和弦
                            { notes: ['F3', 'A3', 'C4'], duration: 2, beat: 2 }  // F和弦
                        ]
                    },
                    // 第5小节: "Happy Birth-"
                    {
                        notes: [
                            { note: 'C5', duration: 0.5, beat: 1 },      // Hap-
                            { note: 'C5', duration: 0.5, beat: 1.5 },    // py
                            { note: 'A4', duration: 1, beat: 2 },        // Birth-
                            { note: 'F4', duration: 1, beat: 3 }         // day
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 1, beat: 1 }, // C和弦
                            { notes: ['F3', 'A3', 'C4'], duration: 2, beat: 2 }  // F和弦
                        ]
                    },
                    // 第6小节: "day dear"
                    {
                        notes: [
                            { note: 'E4', duration: 1, beat: 1 },        // dear
                            { note: 'D4', duration: 2, beat: 2 }         // (name)
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 1, beat: 1 }, // C和弦
                            { notes: ['G3', 'B3', 'D4'], duration: 2, beat: 2 }  // G和弦
                        ]
                    },
                    // 第7小节: "Happy Birth-"
                    {
                        notes: [
                            { note: 'C5', duration: 0.5, beat: 1 },      // Hap-
                            { note: 'C5', duration: 0.5, beat: 1.5 },    // py
                            { note: 'A4', duration: 1, beat: 2 },        // Birth-
                            { note: 'F4', duration: 1, beat: 3 }         // day
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 1, beat: 1 }, // C和弦
                            { notes: ['F3', 'A3', 'C4'], duration: 2, beat: 2 }  // F和弦
                        ]
                    },
                    // 第8小节: "day to you"
                    {
                        notes: [
                            { note: 'G4', duration: 1, beat: 1 },        // to
                            { note: 'C4', duration: 2, beat: 2 }         // you
                        ],
                        harmony: [
                            { notes: ['G3', 'B3', 'D4'], duration: 1, beat: 1 }, // G和弦
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 2 }  // C和弦
                        ]
                    }
                ]
            },

            // 小星星 - Twinkle Twinkle Little Star
            twinkleStar: {
                title: "小星星",
                composer: "Traditional",
                timeSignature: [4, 4], // 4/4拍
                keySignature: 'C',
                tempo: 120,
                measures: [
                    // 第1小节: "Twinkle twinkle little star"
                    {
                        notes: [
                            { note: 'C4', duration: 1, beat: 1 },    // Twin-
                            { note: 'C4', duration: 1, beat: 2 },    // kle
                            { note: 'G4', duration: 1, beat: 3 },    // twin-
                            { note: 'G4', duration: 1, beat: 4 }     // kle
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 4, beat: 1 } // C和弦
                        ]
                    },
                    // 第2小节: "little star"
                    {
                        notes: [
                            { note: 'A4', duration: 1, beat: 1 },    // lit-
                            { note: 'A4', duration: 1, beat: 2 },    // tle
                            { note: 'G4', duration: 2, beat: 3 }     // star
                        ],
                        harmony: [
                            { notes: ['F3', 'A3', 'C4'], duration: 2, beat: 1 }, // F和弦
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 3 }  // C和弦
                        ]
                    },
                    // 第3小节: "How I wonder what you are"
                    {
                        notes: [
                            { note: 'F4', duration: 1, beat: 1 },    // How
                            { note: 'F4', duration: 1, beat: 2 },    // I
                            { note: 'E4', duration: 1, beat: 3 },    // won-
                            { note: 'E4', duration: 1, beat: 4 }     // der
                        ],
                        harmony: [
                            { notes: ['F3', 'A3', 'C4'], duration: 2, beat: 1 }, // F和弦
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 3 }  // C和弦
                        ]
                    },
                    // 第4小节: "what you are"
                    {
                        notes: [
                            { note: 'D4', duration: 1, beat: 1 },    // what
                            { note: 'D4', duration: 1, beat: 2 },    // you
                            { note: 'C4', duration: 2, beat: 3 }     // are
                        ],
                        harmony: [
                            { notes: ['G3', 'B3', 'D4'], duration: 2, beat: 1 }, // G和弦
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 3 }  // C和弦
                        ]
                    }
                ]
            },

            // 欢乐颂 - Ode to Joy (贝多芬)
            odeToJoy: {
                title: "欢乐颂",
                composer: "Ludwig van Beethoven",
                timeSignature: [4, 4],
                keySignature: 'C',
                tempo: 120,
                measures: [
                    // 第1小节
                    {
                        notes: [
                            { note: 'E4', duration: 1, beat: 1 },
                            { note: 'E4', duration: 1, beat: 2 },
                            { note: 'F4', duration: 1, beat: 3 },
                            { note: 'G4', duration: 1, beat: 4 }
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 1 },
                            { notes: ['F3', 'A3', 'C4'], duration: 1, beat: 3 },
                            { notes: ['G3', 'B3', 'D4'], duration: 1, beat: 4 }
                        ]
                    },
                    // 第2小节
                    {
                        notes: [
                            { note: 'G4', duration: 1, beat: 1 },
                            { note: 'F4', duration: 1, beat: 2 },
                            { note: 'E4', duration: 1, beat: 3 },
                            { note: 'D4', duration: 1, beat: 4 }
                        ],
                        harmony: [
                            { notes: ['G3', 'B3', 'D4'], duration: 1, beat: 1 },
                            { notes: ['F3', 'A3', 'C4'], duration: 1, beat: 2 },
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 3 }
                        ]
                    },
                    // 第3小节
                    {
                        notes: [
                            { note: 'C4', duration: 1, beat: 1 },
                            { note: 'C4', duration: 1, beat: 2 },
                            { note: 'D4', duration: 1, beat: 3 },
                            { note: 'E4', duration: 1, beat: 4 }
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 1 },
                            { notes: ['G3', 'B3', 'D4'], duration: 1, beat: 3 },
                            { notes: ['C3', 'E3', 'G3'], duration: 1, beat: 4 }
                        ]
                    },
                    // 第4小节
                    {
                        notes: [
                            { note: 'E4', duration: 1.5, beat: 1 },
                            { note: 'D4', duration: 0.5, beat: 2.5 },
                            { note: 'D4', duration: 2, beat: 3 }
                        ],
                        harmony: [
                            { notes: ['C3', 'E3', 'G3'], duration: 2, beat: 1 },
                            { notes: ['G3', 'B3', 'D4'], duration: 2, beat: 3 }
                        ]
                    }
                ]
            }
        };
    }

    // 🎵 根据游戏速度计算音乐节拍 (BPM)
    _calculateTempo(speedRatio) {
        const baseTempo = 120; // 基础120 BPM
        const maxTempo = 180;  // 最高180 BPM
        return Math.min(baseTempo + (speedRatio - 1) * 40, maxTempo);
    }

    // 🎯 根据速度选择歌曲
    _selectSong(speedRatio) {
        if (speedRatio < 1.3) return 'twinkleStar';      // 小星星 - 简单轻快
        if (speedRatio < 2.0) return 'happyBirthday';    // 生日快乐 - 中等节奏
        return 'odeToJoy';                               // 欢乐颂 - 激昂有力
    }

    // 🎼 音符名称转换为频率
    _noteToFrequency(noteName) {
        const noteMap = {
            // 第2八度
            'C2': 65.41, 'C#2': 69.30, 'Db2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'Eb2': 77.78,
            'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'Gb2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'Ab2': 103.83,
            'A2': 110.00, 'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47,
            
            // 第4八度
            'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13,
            'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'Ab4': 415.30,
            'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
            
            // 第5八度
            'C5': 523.25, 'C#5': 554.37, 'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25,
            'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'Ab5': 830.61,
            'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
            
            // 第6八度
            'C6': 1046.50, 'C#6': 1108.73, 'Db6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'Eb6': 1244.51,
            'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'Gb6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22, 'Ab6': 1661.22,
            'A6': 1760.00, 'A#6': 1864.66, 'Bb6': 1864.66, 'B6': 1975.53
        };
        
        return noteMap[noteName] || 440; // 默认返回A4
    }

    // 🎵 播放真实歌曲的一个小节
    _playMeasureFromRealSheet(measure, startTime, beatDuration, speedRatio) {
        if (!measure) return;

        const volumeMultiplier = 0.8 + speedRatio * 0.4; // 根据速度调整整体音量

        // 🎵 播放主旋律音符
        if (measure.notes && measure.notes.length > 0) {
            measure.notes.forEach(noteData => {
                const noteStartTime = startTime + (noteData.beat - 1) * beatDuration;
                const noteDuration = noteData.duration * beatDuration;
                
                this._playRealNote(noteData.note, noteStartTime, noteDuration, volumeMultiplier * 1.2, 'sine');
            });
        }

        // 🎹 播放和声/和弦
        if (measure.harmony && measure.harmony.length > 0) {
            measure.harmony.forEach(harmonyData => {
                const harmonyStartTime = startTime + (harmonyData.beat - 1) * beatDuration;
                const harmonyDuration = harmonyData.duration * beatDuration;
                
                // 播放和弦中的每个音符
                harmonyData.notes.forEach((noteName, index) => {
                    // 琶音效果：每个音符稍微错开
                    const arpeggioDelay = index * 0.03;
                    this._playRealNote(
                        noteName, 
                        harmonyStartTime + arpeggioDelay, 
                        harmonyDuration - arpeggioDelay, 
                        volumeMultiplier * 0.6, 
                        'triangle'
                    );
                });
            });
        }

        // 🥁 添加简单的节拍（可选）
        if (speedRatio > 1.2) {
            this._addSimpleRhythm(startTime, beatDuration, speedRatio, measure);
        }
    }

    // 🎵 播放单个音符
    _playRealNote(noteName, startTime, duration, volume, waveType = 'sine') {
        if (!this.audioContext || this.audioContext.state === 'suspended') return;

        const frequency = this._noteToFrequency(noteName);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = waveType;
        
        const finalVolume = volume * this.volume * 0.15; // 降低整体音量
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(finalVolume, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.05);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    // 🥁 添加简单节拍
    _addSimpleRhythm(startTime, beatDuration, speedRatio, measure) {
        // 根据拍号添加基础节拍
        const timeSignature = [4, 4]; // 默认4/4拍
        const beatsPerMeasure = timeSignature[0];
        
        for (let beat = 1; beat <= beatsPerMeasure; beat++) {
            const beatTime = startTime + (beat - 1) * beatDuration;
            
            // 强拍用踢鼓
            if (beat === 1 || beat === 3) {
                this._createDrumHit(beatTime, 60, 0.1, 0.04 * speedRatio);
            }
            
            // 弱拍用军鼓（高速时）
            if (speedRatio > 1.5 && (beat === 2 || beat === 4)) {
                this._createDrumHit(beatTime, 200, 0.08, 0.03 * speedRatio);
            }
            
            // 高帽（极高速时）
            if (speedRatio > 1.8) {
                this._createDrumHit(beatTime + beatDuration * 0.5, 8000, 0.03, 0.02 * speedRatio);
            }
        }
    }





    // 创建鼓点
    _createDrumHit(startTime, frequency, duration, volume) {
        if (!this.audioContext || this.audioContext.state === 'suspended') return;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.frequency.value = frequency;
        // 修复：使用有效的振荡器类型
        osc.type = frequency < 100 ? 'square' : 'sawtooth'; // 用锯齿波替代白噪声
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume * this.volume, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    }


}

// A class to manage the core Three.js components
class BasicWorld {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.raycaster = new THREE.Raycaster();
        this.groundNormal = new THREE.Vector3(0, 1, 0);
        
        this._setup();
    }

    _setup() {
        // Renderer setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0xb8e6ff); // 清新的天蓝色

        // Add Fog - 调整雾效参数
        this.scene.fog = new THREE.Fog(0xb8e6ff, 25, 130); // 配合新背景色

        // Camera setup
        this.camera.position.set(0, 5, 10); // Positioned behind the player
        this.camera.lookAt(0, 0, 0);

        // Enhanced Lighting - 增强光照效果
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 提高环境光
        this.scene.add(ambientLight);

        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(0, 15, 5); // 调整光源位置
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
        
        // 添加补充光源 - 温暖色调
        const fillLight = new THREE.DirectionalLight(0xfff4e6, 0.4);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
        
        // 顶部光源，照亮障碍物
        const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
        topLight.position.set(0, 20, 0);
        this.scene.add(topLight);
    }

    // Method to add objects to the scene
    add(object) {
        this.scene.add(object);
    }

    // Render loop - now takes an update function
    render(update) {
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render(update));
        
        // Call the update function if it's provided
        if (typeof update === 'function') {
            update();
        }
    }
}

// Main game class
class Game {
    constructor() {
        this.world = new BasicWorld();
        this.player = null;
        
        // 初始化音频管理器
        this.audioManager = new AudioManager();
        this.audioManager.gameRef = this; // 设置游戏实例引用
        this.audioManager.initGameAudio();
        
        // 设置背景音乐的游戏引用，用于动态调整节奏
        setTimeout(() => {
            if (this.audioManager.backgroundMusic) {
                this.audioManager.backgroundMusic.gameRef = this;
            }
        }, 200);
        
        // 记录上次的速度，用于检测音乐切换
        this.lastSpeedRatio = 1.0;
        
        // Ground properties - 动态路段长度系统
        this.groundSegments = []; // 池
        this.numGroundSegments = 30; // 增加池大小以适应更短的路段
        this.baseGroundSegmentLength = 10; // 基础路段长度（低速时）
        this.maxGroundSegmentLength = 50; // 最大路段长度（高速时）
        this.currentSegmentLength = this.baseGroundSegmentLength; // 当前动态路段长度
        this.groundSegmentWidth = 10;
        this.activePath = []; // 当前活跃的段
        this.nextPathPosition = new THREE.Vector3(0, 0, 0);

        // Speed properties - 更渐进的加速系统
        this.initialRunSpeed = 0.08;  // 低初始速度
        this.maxRunSpeed = 0.8;
        this.runSpeedIncrease = 0.00008; // 大幅降低加速度（从0.0003降到0.00008）
        this.runSpeed = this.initialRunSpeed;
        this.distanceTraveled = 0; // 跑过的距离

        // 简化的相机设置
        this.cameraOffset = new THREE.Vector3(0, 5, 10);

        // Player movement properties
        this.lanes = [-3, 0, 3]; // X-coordinates for left, center, right lanes
        this.currentLane = 1; // Start in the middle lane (index 1)
        this.targetX = 0;
        this.moveLerpFactor = 0.1; // Controls how smoothly the player changes lanes
        this.velocityY = 0; // For jumping
        this.gravity = -0.02;
        this.jumpStrength = 0.5;
        this.isJumping = false;

        // Obstacle properties - 多种障碍物类型
        this.obstaclePool = [];
        this.activeObstacles = [];
        this.numObstacles = 30; // 扩大池大小
        this.baseObstacleChance = 0.7; // 进一步提高基础障碍出现率
        this.obstacleTypes = {
            SINGLE: 'single',      // 单个障碍
            DOUBLE: 'double',      // 双车道障碍
            TRIPLE: 'triple',      // 三车道障碍需要跳跃
            WALL: 'wall',          // 墙障碍
            LOW_BARRIER: 'low'     // 低障碍（必须跳跃）
        };

        // Coin properties - 多种金币模式
        this.coinPool = [];
        this.activeCoins = [];
        this.numCoins = 50; // 扩大池大小
        this.baseCoinChance = 0.85; // 进一步提高基础金币出现率
        this.baseCoinValue = 10;
        this.coinPatterns = {
            LINE: 'line',          // 直线排列
            ZIG_ZAG: 'zigzag',     // Z字型
            CIRCLE: 'circle',      // 圈形
            WALL: 'wall',          // 墙形
            BONUS: 'bonus'         // 奖励模式
        };

        // Game state
        this.gameOver = false;
        this.score = 0;
        this.gameStartTime = null; // 记录游戏开始时间

        // Animation properties
        this.clock = new THREE.Clock();
        this.mixer = null;

        // UI Elements
        this.scoreElement = document.getElementById('score');
        this.scoreContainer = document.getElementById('score-container'); // 用于特效
        this.finalScoreElement = document.getElementById('final-score');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.muteBtn = document.getElementById('mute-btn');
        this.musicBtn = document.getElementById('music-btn');

        this._createInitialScene();
        this._setupControls();
        this._setupAudioControls();
        this._setupMobileUI();
    }

    _createObstaclePool() {
        // 创建不同类型的障碍物 - 与绿色地面形成强烈对比
        const materials = {
            normal: new THREE.MeshStandardMaterial({ 
                color: 0xffbbff,       // 超极亮的红紫色
                emissive: 0xdd66bb,    // 超极强的红紫发光
                metalness: 0.2,
                roughness: 0.1
            }),
            wall: new THREE.MeshStandardMaterial({ 
                color: 0xff77ff,       // 超极亮的深红紫色
                emissive: 0xcc44cc,    // 超极强烈发光
                metalness: 0.3,
                roughness: 0.05
            }),
            low: new THREE.MeshStandardMaterial({ 
                color: 0xffff77,       // 超极亮的橙色
                emissive: 0xdddd44,    // 超极强的橙色发光
                metalness: 0.1,
                roughness: 0.1
            })
        };

        for (let i = 0; i < this.numObstacles; i++) {
            let geometry, material, obstacleType;
            
            // 根据索引分配不同类型
            if (i < 15) {
                // 普通障碍
                geometry = new THREE.BoxGeometry(1.5, 2, 1.5);
                material = materials.normal;
                obstacleType = this.obstacleTypes.SINGLE;
            } else if (i < 25) {
                // 低障碍
                geometry = new THREE.BoxGeometry(2, 1, 2);
                material = materials.low;
                obstacleType = this.obstacleTypes.LOW_BARRIER;
            } else {
                // 墙障碍
                geometry = new THREE.BoxGeometry(2, 3, 1);
                material = materials.wall;
                obstacleType = this.obstacleTypes.WALL;
            }

            const obstacle = new THREE.Mesh(geometry, material);
            obstacle.visible = false;
            obstacle.castShadow = true;
            obstacle.geometry.computeBoundingBox();
            obstacle.userData.type = obstacleType;
            obstacle.userData.originalScale = obstacle.scale.clone();
            
            // 添加边缘发光效果
            this._addObstacleGlow(obstacle, obstacleType);
            
            this.world.add(obstacle);
            this.obstaclePool.push(obstacle);
        }
    }

    _createCoinPool() {
        const coinGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
        const normalCoinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffaa,       // 超极亮的金色，在绿色地面上超级突出
            emissive: 0xffff88,    // 超极强的金色发光
            metalness: 1.0,
            roughness: 0.01
        });
        
        const bonusCoinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffcc88,       // 超极亮的橙红色
            emissive: 0xffaa66,    // 超极强烈橙红发光
            metalness: 1.0,
            roughness: 0.005
        });

        for (let i = 0; i < this.numCoins; i++) {
            const isBonus = i >= this.numCoins * 0.8; // 20%为奖励金币
            const coin = new THREE.Mesh(coinGeometry, isBonus ? bonusCoinMaterial : normalCoinMaterial);
            
            coin.visible = false;
            coin.rotation.x = Math.PI / 2;
            coin.geometry.computeBoundingBox();
            coin.userData.isBonus = isBonus;
            coin.userData.value = isBonus ? this.baseCoinValue * 3 : this.baseCoinValue;
            coin.userData.originalScale = coin.scale.clone();
            
            this.world.add(coin);
            this.coinPool.push(coin);
        }
    }

    _addObstacleGlow(obstacle, obstacleType) {
        // 为障碍物添加边缘发光效果
        let glowColor;
        switch (obstacleType) {
            case this.obstacleTypes.SINGLE:
                glowColor = 0xffbbff;  // 超极亮的红紫色发光
                break;
            case this.obstacleTypes.LOW_BARRIER:
                glowColor = 0xffff77;  // 超极亮的橙色发光
                break;
            case this.obstacleTypes.WALL:
                glowColor = 0xff77ff;  // 超极亮的深红紫发光
                break;
            default:
                glowColor = 0xffbbff;
        }
        
        // 创建发光边缘
        const glowGeometry = obstacle.geometry.clone();
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.7,  // 超强发光透明度
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.scale.multiplyScalar(1.2); // 最大的发光边缘
        glowMesh.visible = false;
        
        obstacle.add(glowMesh);
        obstacle.userData.glowMesh = glowMesh;
    }

    _createInitialScene() {
        // Create Player (a cube for now)
        const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
        const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Green cube
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.castShadow = true;
        // Make the cube invisible but still participate in physics/collisions
        this.player.material.transparent = true;
        this.player.material.opacity = 0;
        this.player.geometry.computeBoundingBox(); // Important for collision detection
        this.world.add(this.player);
        this._loadPlayerModel();

        // Create ground segment pool - 使用清新的蓝绿色路面
        // 使用最大路段长度创建几何体，后续通过缩放调整
        console.log('🛤️ 创建路段池，几何体尺寸:', this.groundSegmentWidth, 'x', this.maxGroundSegmentLength, '(基础长度:', this.baseGroundSegmentLength, ')');
        const straightGeo = new THREE.PlaneGeometry(this.groundSegmentWidth, this.maxGroundSegmentLength);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d4a3d,      // 深绿色，与红色障碍形成强烈对比
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x0a1a0f    // 轻微的绿色发光
        });
        
        for (let i = 0; i < this.numGroundSegments; i++) {
            const ground = new THREE.Mesh(straightGeo, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            ground.visible = false;
            this.world.add(ground);
            this.groundSegments.push({
                mesh: ground,
                type: 'straight',
                originalMaterial: groundMaterial
            });
        }
        console.log('✅ 路段池创建完成，总数:', this.numGroundSegments);

        // Create obstacle pool - 多种类型
        this._createObstaclePool();

        // Create coin pool - 多种金币类型
        this._createCoinPool();

        // Initialize to initial state (without clearing obstacles)
        console.log('🏗️ 开始初始化游戏状态...');
        this._initializeGameState();
        console.log('✅ 游戏状态初始化完成');
    }

    _loadPlayerModel() {
        const loader = new GLTFLoader();
        loader.load(
            // Using a CDN link for the model
            './models/RobotExpressive.glb',
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.4, 0.4, 0.4);
                // The model's feet are at its origin, so we lift it up by its bounding box height
                model.position.y = -0.5; 

                model.traverse(c => {
                    if (c.isMesh) {
                        c.castShadow = true;
                    }
                });

                // Set initial rotation to face forward (negative Z direction)
                model.rotation.y = Math.PI; // 旋转180度使机器人朝向负Z轴（向前）
                
                // Attach the model to the invisible player cube
                this.player.add(model);
                this.player.userData.model = model; // Keep a reference to the model
                
                // 确保角色始终朝向前进方向
                this._updatePlayerModelDirection();

                // Setup animations - 动态速度控制
                this.mixer = new THREE.AnimationMixer(model);
                const runClip = THREE.AnimationClip.findByName(gltf.animations, 'Running');
                if (runClip) {
                    this.runAction = this.mixer.clipAction(runClip);
                    this.runAction.play();
                    this.baseAnimationSpeed = 0.7; // 降低基础动画速度
                } else {
                    // Fallback to the first animation if 'Running' is not found
                    this.runAction = this.mixer.clipAction(gltf.animations[0]);
                    this.runAction.play();
                    this.baseAnimationSpeed = 0.7;
                }
            },
            undefined,
            (error) => {
                console.error('An error happened while loading the player model:', error);
            }
        );
    }

    _setupControls() {
        // 键盘控制
        window.addEventListener('keydown', (event) => {
            if (this.gameOver) {
                if (event.key === 'r' || event.key === 'R') {
                    this.reset();
                }
                return;
            }

            const key = event.key.toLowerCase();

            // 简化的车道切换逻辑 - 只有左移右移
            if (key === 'a' || key === 'arrowleft') {
                this._moveLeft();
            } else if (key === 'd' || key === 'arrowright') {
                this._moveRight();
            }

            if (key === ' ' || key === 'spacebar') {
                this._jump();
            }
        });

        // 移动端触摸控制
        this._setupTouchControls();
    }

    _setupTouchControls() {
        const canvas = document.getElementById('game-canvas');
        
        // 触摸开始位置
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;
        
        // 触摸开始
        canvas.addEventListener('touchstart', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchStartTime = Date.now();
        }, { passive: false });
        
        // 触摸结束
        canvas.addEventListener('touchend', (event) => {
            event.preventDefault();
            
            if (this.gameOver) {
                // 游戏结束时，点击重新开始
                this.reset();
                return;
            }
            
            const touch = event.changedTouches[0];
            const touchEndX = touch.clientX;
            const touchEndY = touch.clientY;
            const touchEndTime = Date.now();
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = touchEndTime - touchStartTime;
            
            // 判断手势类型
            const minSwipeDistance = 50; // 最小滑动距离
            const maxTapTime = 200; // 最大点击时间
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // 水平滑动 - 切换车道
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        this._moveRight();
                    } else {
                        this._moveLeft();
                    }
                }
            } else if (deltaY < -minSwipeDistance) {
                // 向上滑动 - 跳跃
                this._jump();
            } else if (deltaTime < maxTapTime && Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
                // 点击 - 跳跃
                this._jump();
            }
        }, { passive: false });
        
        // 防止滚动
        canvas.addEventListener('touchmove', (event) => {
            event.preventDefault();
        }, { passive: false });
        
        console.log('📱 移动端触摸控制已设置');
    }

    // 抽取移动逻辑为独立方法
    _moveLeft() {
        if (this.currentLane > 0) {
            this.currentLane--;
            this.audioManager.playSound('move', 0.5);
        }
    }

    _moveRight() {
        if (this.currentLane < this.lanes.length - 1) {
            this.currentLane++;
            this.audioManager.playSound('move', 0.5);
        }
    }

    _jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.velocityY = this.jumpStrength;
            this.audioManager.playSound('jump', 0.4);
        }
    }

    _setupMobileUI() {
        // 检测移动端设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0);
        
        if (isMobile) {
            console.log('📱 检测到移动端设备');
            this._showMobileControlsHint();
            
            // 移动端特殊处理：隐藏地址栏
            window.addEventListener('load', () => {
                setTimeout(() => {
                    window.scrollTo(0, 1);
                }, 100);
            });
            
            // 防止双击缩放
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (event) => {
                const now = (new Date()).getTime();
                if (now - lastTouchEnd <= 300) {
                    event.preventDefault();
                }
                lastTouchEnd = now;
            }, false);
            
        } else {
            console.log('🖥️ 检测到桌面端设备');
        }
    }

    _showMobileControlsHint() {
        const hintElement = document.getElementById('mobile-controls-hint');
        if (hintElement) {
            hintElement.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                hintElement.style.display = 'none';
            }, 5000);
            
            // 点击隐藏
            hintElement.addEventListener('click', () => {
                hintElement.style.display = 'none';
            });
        }
    }

    _setupAudioControls() {
        // 静音按钮
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => {
                this.audioManager.toggleMute();
                this.muteBtn.textContent = this.audioManager.isMuted ? '🔇' : '🔊';
            });
        }

        // 音乐控制按钮
        if (this.musicBtn) {
            this.musicBtn.addEventListener('click', () => {
                this.audioManager.toggleBackgroundMusic();
                // 更新按钮显示状态
                if (this.audioManager.backgroundMusic) {
                    this.musicBtn.textContent = this.audioManager.backgroundMusic.paused ? '🎵' : '⏸️';
                }
            });
        }
    }

    _updateGround() {
        const playerZ = this.player.position.z;
        const recycleDistance = this.currentSegmentLength * 3;
        const spawnDistance = this.currentSegmentLength * 5;

        // 移除玩家后方远处的段（玩家向负Z移动，所以后方的段Z值较大）
        for (let i = this.activePath.length - 1; i >= 0; i--) {
            const segment = this.activePath[i];
            if (segment.mesh.position.z - playerZ > recycleDistance) {
                segment.mesh.visible = false;
                this._deactivateObjectsOnSegment(segment.mesh);
                this.groundSegments.push(segment); // 返回池中
                this.activePath.splice(i, 1);
            }
        }

        // 按需添加新段
        const targetSegments = 10; // 保持 10 个段活跃
        while (this.activePath.length < targetSegments && this.groundSegments.length > 0) {
            this._generateNextSegment();
        }
    }
    
    _generateNextSegment() {
        if (this.groundSegments.length === 0) {
            console.warn('地面段池为空！活跃段数:', this.activePath.length);
            return;
        }

        const segment = this.groundSegments.pop();
        
        // 简化为只生成直线路段
        segment.mesh.position.copy(this.nextPathPosition);
        segment.mesh.rotation.set(-Math.PI / 2, 0, 0); // 水平放置
        
        // 动态缩放路段以适应当前长度
        const scaleRatio = this.currentSegmentLength / this.maxGroundSegmentLength;
        segment.mesh.scale.set(1, scaleRatio, 1); // 只缩放Z轴（长度方向）
        
        // 使用普通材质
        segment.mesh.material = segment.originalMaterial;
        
        segment.mesh.visible = true;
        this.activePath.push(segment);
        
        console.log('🆕 生成新段在位置:', this.nextPathPosition.z.toFixed(1), '长度:', this.currentSegmentLength, '池剩余:', this.groundSegments.length, '活跃:', this.activePath.length);
        
        // 移动到下一个位置（始终向前），使用动态路段长度
        this.nextPathPosition.add(new THREE.Vector3(0, 0, -this.currentSegmentLength));
        
        // 尝试在新路段上放置收集品
        this._tryPlaceCollectibles(segment.mesh);
    }

    _tryPlaceCollectibles(segment) {
        // 清理该段上现有的物体
        this._deactivateObjectsOnSegment(segment);

        // 优化障碍物出现时机，3秒后立即出现第一个障碍物
        const currentTime = Date.now();
        const gameElapsedTime = this.gameStartTime ? (currentTime - this.gameStartTime) / 1000 : 0; // 转换为秒
        const safetyPeriod = 3.0; // 3秒安全期
        const safetyDistance = 15; // 对应3秒的距离（初始速度0.08*60fps*3s≈15单位，约1.5个基础路段）
        
        const random = Math.random();
        const difficultyLevel = Math.floor(this.distanceTraveled / 200);
        
        // 3秒安全期检查：时间OR距离任一满足就跳过障碍物生成
        if (gameElapsedTime < safetyPeriod || this.distanceTraveled < safetyDistance) {
            // 安全期内只放置金币，给玩家适应时间
            if (random < 0.7) {
                console.log('🪙 安全期内放置金币，时间:', gameElapsedTime.toFixed(1), '距离:', this.distanceTraveled.toFixed(1));
                this._placeCoins(segment, difficultyLevel);
            }
            return;
        }
        
        // 3秒后立即强制生成第一个障碍物
        let adjustedObstacleChance = this.obstacleChance;
        
        // 3秒后如果还没有障碍物，立即100%生成
        if (gameElapsedTime >= safetyPeriod && this.activeObstacles.length === 0) {
            adjustedObstacleChance = 1.0; // 100%概率生成障碍物
            console.log('🚧 3秒安全期结束，立即生成第一个障碍物！时间:', gameElapsedTime.toFixed(1), '秒');
        }
        // 早期阶段提高概率，确保障碍物密度合适
        else if (this.distanceTraveled < 100) {
            adjustedObstacleChance = Math.max(this.obstacleChance, 0.8); // 80%概率
        }
        
        if (random < adjustedObstacleChance) {
            console.log('🚧 放置障碍物，概率:', adjustedObstacleChance.toFixed(2), '随机值:', random.toFixed(2));
            this._placeObstacles(segment, difficultyLevel);
        } else if (random < adjustedObstacleChance + this.coinChance) {
            console.log('🪙 放置金币，概率:', (adjustedObstacleChance + this.coinChance).toFixed(2), '随机值:', random.toFixed(2));
            this._placeCoins(segment, difficultyLevel);
        }
        // 否则该段保持空白
    }

    _placeObstacles(segment, difficultyLevel) {
        if (this.obstaclePool.length === 0) return;
        
        // 选择障碍模式
        const patterns = ['single', 'double', 'gap'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        switch (pattern) {
            case 'single':
                this._placeSingleObstacle(segment);
                break;
            case 'double':
                if (difficultyLevel >= 2) {
                    this._placeDoubleObstacle(segment);
                } else {
                    this._placeSingleObstacle(segment);
                }
                break;
            case 'gap':
                if (difficultyLevel >= 3) {
                    this._placeGapObstacle(segment);
                } else {
                    this._placeSingleObstacle(segment);
                }
                break;
        }
    }

    _placeSingleObstacle(segment) {
        if (this.obstaclePool.length === 0) return;
        
        const obstacle = this.obstaclePool.pop();
        const lane = Math.floor(Math.random() * this.lanes.length);
        const zPos = segment.position.z - Math.random() * this.currentSegmentLength * 0.8;
        
        // 根据障碍类型设置位置
        let yPos = 1;
        if (obstacle.userData.type === this.obstacleTypes.LOW_BARRIER) {
            yPos = 0.5;
        } else if (obstacle.userData.type === this.obstacleTypes.WALL) {
            yPos = 1.5;
        }
        
        obstacle.position.set(this.lanes[lane], yPos, zPos);
        obstacle.visible = true;
        this.activeObstacles.push(obstacle);
        console.log('🚧 单个障碍物已放置，位置:', `(${this.lanes[lane]}, ${yPos}, ${zPos.toFixed(1)})`, '类型:', obstacle.userData.type);
    }

    _placeDoubleObstacle(segment) {
        if (this.obstaclePool.length < 2) {
            this._placeSingleObstacle(segment);
            return;
        }
        
        const lanes = [0, 1, 2];
        const occupiedLanes = [];
        
        // 随机选择两个车道
        for (let i = 0; i < 2; i++) {
            const availableLanes = lanes.filter(lane => !occupiedLanes.includes(lane));
            const selectedLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            occupiedLanes.push(selectedLane);
            
            const obstacle = this.obstaclePool.pop();
            const zPos = segment.position.z - Math.random() * this.currentSegmentLength * 0.8;
            
            obstacle.position.set(this.lanes[selectedLane], 1, zPos);
            obstacle.visible = true;
            this.activeObstacles.push(obstacle);
        }
    }

    _placeGapObstacle(segment) {
        // 在两个车道放置障碍，留一个通道
        if (this.obstaclePool.length < 2) {
            this._placeSingleObstacle(segment);
            return;
        }
        
        const gapLane = Math.floor(Math.random() * 3); // 随机选择空缺车道
        
        for (let lane = 0; lane < 3; lane++) {
            if (lane !== gapLane && this.obstaclePool.length > 0) {
                const obstacle = this.obstaclePool.pop();
                const zPos = segment.position.z - Math.random() * this.currentSegmentLength * 0.8;
                
                obstacle.position.set(this.lanes[lane], 1, zPos);
                obstacle.visible = true;
                this.activeObstacles.push(obstacle);
            }
        }
    }

    _placeCoins(segment, difficultyLevel) {
        const patterns = Object.values(this.coinPatterns);
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        switch (pattern) {
            case this.coinPatterns.LINE:
                this._placeLineCoinPattern(segment);
                break;
            case this.coinPatterns.ZIG_ZAG:
                if (difficultyLevel >= 1) {
                    this._placeZigZagCoinPattern(segment);
                } else {
                    this._placeLineCoinPattern(segment);
                }
                break;
            case this.coinPatterns.WALL:
                if (difficultyLevel >= 2) {
                    this._placeWallCoinPattern(segment);
                } else {
                    this._placeLineCoinPattern(segment);
                }
                break;
            case this.coinPatterns.BONUS:
                if (difficultyLevel >= 3 && Math.random() < 0.3) {
                    this._placeBonusCoinPattern(segment);
                } else {
                    this._placeLineCoinPattern(segment);
                }
                break;
            default:
                this._placeLineCoinPattern(segment);
        }
    }

    _placeLineCoinPattern(segment) {
        const coinsToPlace = Math.min(5, this.coinPool.length);
        if (coinsToPlace === 0) return;
        
        const lane = Math.floor(Math.random() * this.lanes.length);
        const startZ = segment.position.z - this.currentSegmentLength * 0.2;
        
        for (let i = 0; i < coinsToPlace; i++) {
            const coin = this.coinPool.pop();
            coin.position.set(
                this.lanes[lane],
                1.2,
                startZ - i * 3
            );
            coin.visible = true;
            this.activeCoins.push(coin);
            console.log('🪙 金币已放置，位置:', `(${this.lanes[lane]}, 1.2, ${(startZ - i * 3).toFixed(1)})`);
        }
    }

    _placeZigZagCoinPattern(segment) {
        const coinsToPlace = Math.min(6, this.coinPool.length);
        if (coinsToPlace === 0) return;
        
        let currentLane = Math.floor(Math.random() * this.lanes.length);
        const startZ = segment.position.z - this.currentSegmentLength * 0.1;
        
        for (let i = 0; i < coinsToPlace; i++) {
            const coin = this.coinPool.pop();
            coin.position.set(
                this.lanes[currentLane],
                1.2,
                startZ - i * 4
            );
            coin.visible = true;
            this.activeCoins.push(coin);
            
            // 交替车道
            if (i % 2 === 1) {
                currentLane = (currentLane + 1) % this.lanes.length;
            }
        }
    }

    _placeWallCoinPattern(segment) {
        const coinsToPlace = Math.min(9, this.coinPool.length); // 3x3网格
        if (coinsToPlace === 0) return;
        
        const startZ = segment.position.z - this.currentSegmentLength * 0.3;
        let coinIndex = 0;
        
        for (let row = 0; row < 3 && coinIndex < coinsToPlace; row++) {
            for (let lane = 0; lane < 3 && coinIndex < coinsToPlace; lane++) {
                const coin = this.coinPool.pop();
                coin.position.set(
                    this.lanes[lane],
                    1.2 + row * 0.8,
                    startZ - row * 2
                );
                coin.visible = true;
                this.activeCoins.push(coin);
                coinIndex++;
            }
        }
    }

    _placeBonusCoinPattern(segment) {
        // 放置一些奖励金币
        const bonusCoins = this.coinPool.filter(coin => coin.userData.isBonus && !coin.visible);
        const coinsToPlace = Math.min(3, bonusCoins.length);
        
        if (coinsToPlace === 0) {
            this._placeLineCoinPattern(segment);
            return;
        }
        
        const startZ = segment.position.z - this.currentSegmentLength * 0.4;
        
        for (let i = 0; i < coinsToPlace; i++) {
            const coin = bonusCoins[i];
            // 从池中移除
            const poolIndex = this.coinPool.indexOf(coin);
            if (poolIndex > -1) {
                this.coinPool.splice(poolIndex, 1);
            }
            
            coin.position.set(
                this.lanes[i],
                1.5,
                startZ
            );
            coin.visible = true;
            this.activeCoins.push(coin);
        }
    }

    _deactivateObjectsOnSegment(segment) {
        const segmentZ = segment.position.z;
        const segmentRange = this.currentSegmentLength;

        // Deactivate obstacles on this segment
        [...this.activeObstacles].forEach(obstacle => {
            if (obstacle.position.z < segmentZ && obstacle.position.z > segmentZ - segmentRange) {
                this._deactivateObstacle(obstacle);
            }
        });

        // Deactivate coins on this segment
        [...this.activeCoins].forEach(coin => {
            if (coin.position.z < segmentZ && coin.position.z > segmentZ - segmentRange) {
                this._deactivateCoin(coin);
            }
        });
    }

    _deactivateObstacle(obstacle) {
        obstacle.visible = false;
        // 隐藏发光效果
        if (obstacle.userData.glowMesh) {
            obstacle.userData.glowMesh.visible = false;
        }
        // 重置旋转
        obstacle.rotation.set(0, 0, 0);
        
        this.activeObstacles = this.activeObstacles.filter(o => o !== obstacle);
        this.obstaclePool.push(obstacle);
    }

    _deactivateCoin(coin) {
        coin.visible = false;
        this.activeCoins = this.activeCoins.filter(c => c !== coin);
        this.coinPool.push(coin);
    }

    _checkCollisions() {
        const playerBox = new THREE.Box3().setFromObject(this.player);

        // Check obstacle collisions
        for (const obstacle of this.activeObstacles) {
            if (obstacle.visible) {
                const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                if (playerBox.intersectsBox(obstacleBox)) {
                    // 播放碰撞音效
                    this.audioManager.playSound('collision', 0.8);
                    
                    this.gameOver = true;
                    this.finalScoreElement.innerText = this.score;
                    this.gameOverScreen.style.display = 'block';
                    
                    // 停止背景音乐并播放游戏结束音效
                    this.audioManager.stopBackgroundMusic();
                    setTimeout(() => {
                        this.audioManager.playSound('gameover', 0.9);
                    }, 200); // 稍微延迟播放游戏结束音效
                    
                    return; // Exit immediately
                }
            }
        }

        // Check coin collisions - 使用动态价值
        [...this.activeCoins].forEach(coin => {
            if (coin.visible) {
                const coinBox = new THREE.Box3().setFromObject(coin);
                if (playerBox.intersectsBox(coinBox)) {
                    this._deactivateCoin(coin);
                    // 使用金币自身的价值或当前难度价值
                    const coinValue = coin.userData.value || this.coinValue;
                    this.score += coinValue;
                    this._triggerScoreEffect(coin.userData.isBonus);
                    
                    // 播放金币收集音效，奖励金币音调更高
                    if (coin.userData.isBonus) {
                        this.audioManager.playSound('coin', 0.8); // 奖励金币音量更高
                    } else {
                        this.audioManager.playSound('coin', 0.6);
                    }
                }
            }
        });
    }

    _triggerScoreEffect(isBonus = false) {
        console.log('🎯 触发得分特效，当前分数:', this.score, '奖励金币:', isBonus);
        
        // 先更新基础分数段颜色
        this._updateScoreLevel();
        
        // 清除之前的动画效果类
        this.scoreContainer.classList.remove(
            'score-low', 'score-medium', 'score-high', 
            'score-ultra', 'score-legendary', 'score-bonus'
        );
        
        let effectClass;
        let duration = 300;
        
        if (isBonus) {
            // 奖励金币使用彩虹特效
            effectClass = 'score-bonus';
            duration = 300; // 彩虹动画持续时间
        } else {
            // 根据当前总分数选择动画效果
            if (this.score < 500) {
                effectClass = 'score-low';        // 绿色
            } else if (this.score < 1500) {
                effectClass = 'score-medium';     // 蓝色
            } else if (this.score < 3000) {
                effectClass = 'score-high';       // 黄色
            } else if (this.score < 5000) {
                effectClass = 'score-ultra';      // 橙色
            } else {
                effectClass = 'score-legendary';  // 紫色
                duration = 400; // 传奇分数效果持续更久
            }
        }
        
        console.log('🎨 应用特效类:', effectClass, '持续时间:', duration + 'ms');
        this.scoreContainer.classList.add(effectClass);
        
        // 强制触发重绘
        this.scoreContainer.offsetHeight;
        
        // 根据分数段播放不同音调的音效
        this._playScoreSound(effectClass, isBonus);
        
        // 移除动画效果类，但保持基础颜色类
        setTimeout(() => {
            this.scoreContainer.classList.remove(effectClass);
            console.log('🎨 移除特效类:', effectClass);
        }, duration);
    }
    
    _updateScoreLevel() {
        // 清除所有基础分数段颜色类
        this.scoreContainer.classList.remove(
            'score-level-low', 'score-level-medium', 'score-level-high', 
            'score-level-ultra', 'score-level-legendary'
        );
        
        // 根据当前分数添加对应的基础颜色类
        let levelClass;
        if (this.score < 500) {
            levelClass = 'score-level-low';
        } else if (this.score < 1500) {
            levelClass = 'score-level-medium';
        } else if (this.score < 3000) {
            levelClass = 'score-level-high';
        } else if (this.score < 5000) {
            levelClass = 'score-level-ultra';
        } else {
            levelClass = 'score-level-legendary';
        }
        
        this.scoreContainer.classList.add(levelClass);
        console.log('🎨 更新分数段颜色:', levelClass);
    }
    
    _playScoreSound(effectClass, isBonus) {
        if (isBonus) {
            // 奖励金币音效更高亢
            this.audioManager.playSound('coin', 0.9);
        } else {
            // 根据分数段调整音效音调
            let volume = 0.6;
            switch(effectClass) {
                case 'score-low':
                    volume = 0.5;
                    break;
                case 'score-medium':
                    volume = 0.6;
                    break;
                case 'score-high':
                    volume = 0.7;
                    break;
                case 'score-ultra':
                    volume = 0.8;
                    break;
                case 'score-legendary':
                    volume = 0.9;
                    // 传奇分数播放双重音效
                    setTimeout(() => {
                        this.audioManager.playSound('coin', 0.7);
                    }, 100);
                    break;
            }
            this.audioManager.playSound('coin', volume);
        }
    }

    // 初始化游戏状态（用于游戏首次启动，保留生成的障碍物）
    _initializeGameState() {
        // Reset game state
        this.gameOver = false;
        this.score = 0;
        this.scoreElement.innerText = 0;
        this.gameOverScreen.style.display = 'none';
        this.gameStartTime = Date.now(); // 设置游戏开始时间
        
        // 更新分数段颜色
        this._updateScoreLevel();
        
        // Reset difficulty
        this.runSpeed = this.initialRunSpeed;
        this.distanceTraveled = 0;
        this.obstacleChance = this.baseObstacleChance;
        this.coinChance = this.baseCoinChance;
        this.coinValue = this.baseCoinValue;

        // Reset player
        this.currentLane = 1;
        this.player.position.set(0, 0.5, 0);
        this.player.rotation.set(0, 0, 0);
        if (this.player.userData.model) {
            this.player.userData.model.rotation.set(0, 0, 0);
        }
        // 重置动画速度
        if (this.runAction) {
            this.runAction.setEffectiveTimeScale(this.baseAnimationSpeed || 1.0);
        }
        this.velocityY = 0;
        this.isJumping = false;

        // Reset camera
        this.world.camera.position.set(0, 5, 10);
        this.world.camera.lookAt(this.player.position);

        // Reset path generation state - 从玩家位置开始
        this.nextPathPosition.set(0, 0, 0);
        
        // Generate initial path with obstacles (for first time initialization)
        this._generateInitialPath();
        
        // 注意：初始化时不清除障碍物，保留生成的初始障碍物
    }

    // 重置游戏（用于游戏重新开始，清除所有障碍物后重新生成）
    reset() {
        console.log('🔄 开始重置游戏...');
        
        // Deactivate all active objects first
        console.log('🗑️ 清理活跃障碍物:', this.activeObstacles.length, '个');
        [...this.activeObstacles].forEach(obstacle => this._deactivateObstacle(obstacle));
        console.log('🗑️ 清理活跃金币:', this.activeCoins.length, '个');
        [...this.activeCoins].forEach(coin => this._deactivateCoin(coin));
        
        // 重新开始背景音乐
        this.audioManager.stopBackgroundMusic();
        this.audioManager.playBackgroundMusic();

        // Reset game state
        this.gameOver = false;
        this.score = 0;
        this.scoreElement.innerText = 0;
        this.gameOverScreen.style.display = 'none';
        this.gameStartTime = Date.now(); // 重新设置游戏开始时间
        
        // 更新分数段颜色
        this._updateScoreLevel();
        
        // Reset difficulty
        this.runSpeed = this.initialRunSpeed;
        this.distanceTraveled = 0;
        this.obstacleChance = this.baseObstacleChance;
        this.coinChance = this.baseCoinChance;
        this.coinValue = this.baseCoinValue;
        
        // 重置动态路段长度系统
        this.currentSegmentLength = this.baseGroundSegmentLength;
        this.lastSegmentLength = undefined; // 清除上次长度记录，确保调试信息显示
        this.lastSpeedRatio = 1.0; // 重置音乐速度记录
        console.log('🔄 重置动态路段长度为基础长度:', this.currentSegmentLength);

        // Reset player
        this.currentLane = 1;
        this.player.position.set(0, 0.5, 0);
        this.player.rotation.set(0, 0, 0);
        if (this.player.userData.model) {
            this.player.userData.model.rotation.set(0, 0, 0);
        }
        // 重置动画速度
        if (this.runAction) {
            this.runAction.setEffectiveTimeScale(this.baseAnimationSpeed || 1.0);
        }
        this.velocityY = 0;
        this.isJumping = false;

        // Reset camera
        this.world.camera.position.set(0, 5, 10);
        this.world.camera.lookAt(this.player.position);

        // Reset path generation state - 从玩家位置开始
        this.nextPathPosition.set(0, 0, 0);
        
        // Generate fresh initial path with obstacles
        console.log('🛤️ 重新生成初始路径...');
        this._generateInitialPath();
        console.log('✅ 游戏重置完成！');
    }

    _generateInitialPath() {
        // 清理现有路径，将所有段返回池中
        [...this.activePath].forEach(segment => {
            segment.mesh.visible = false;
            this.groundSegments.push(segment);
        });
        this.activePath = [];
        
        // console.log('初始化路径，池中段数:', this.groundSegments.length, '起始位置:', this.nextPathPosition);
        
        // 生成初始直线路径
        const initialSegments = Math.min(10, this.groundSegments.length); // 初始生成 10 个段
        for(let i = 0; i < initialSegments; i++) {
            if (this.groundSegments.length === 0) {
                console.warn('初始化时池为空！');
                break;
            }
            
            const segment = this.groundSegments.pop(); // 从池中取出
            segment.mesh.position.copy(this.nextPathPosition);
            segment.mesh.rotation.set(-Math.PI / 2, 0, 0);
            
            // 应用动态缩放（初始时使用基础长度）
            const scaleRatio = this.currentSegmentLength / this.maxGroundSegmentLength;
            segment.mesh.scale.set(1, scaleRatio, 1);
            
            segment.mesh.visible = true;
            segment.mesh.material = segment.originalMaterial;
            this.activePath.push(segment);
            
            console.log('初始段', i, '位置:', this.nextPathPosition.z, '缩放:', scaleRatio.toFixed(3));
            
            // 使用统一的收集品放置逻辑，包括3秒安全期检查
            this._tryPlaceCollectibles(segment.mesh);
            
            // 移动到下一个位置（始终向前），使用动态长度
            this.nextPathPosition.add(new THREE.Vector3(0, 0, -this.currentSegmentLength));
        }
        
        console.log('🛤️ 初始化完成，活跃段数:', this.activePath.length, '池剩余:', this.groundSegments.length);
    }




    _updatePlayerModelDirection() {
        // 确保玩家模型始终朝向前进方向（负Z轴）
        if (this.player.userData.model) {
            // RobotExpressive模型默认朝向可能是+Z，需要旋转180度朝向-Z
            this.player.userData.model.rotation.y = Math.PI; // 旋转180度朝向负Z轴（向前）
        }
    }

    _updateDifficulty() {
        // 基于跑过距离计算难度级别 - 更渐进的难度提升
        const difficultyLevel = Math.floor(this.distanceTraveled / 200); // 每200单位提升一级（从100增加到200）
        
        // 动态调整游戏参数
        this._updateGameParameters(difficultyLevel);
    }

    _updateGameParameters(level) {
        // 速度递增（有上限）- 非常渐进的加速
        const targetSpeed = Math.min(this.initialRunSpeed + level * 0.025, this.maxRunSpeed); // 每级增加0.025（从0.04降低）
        if (this.runSpeed < targetSpeed) {
            this.runSpeed += this.runSpeedIncrease * 3; // 较慢的速度接近目标值
        }
        
        // 障碍出现率递增 - 更渐进的增长
        this.obstacleChance = Math.min(this.baseObstacleChance + level * 0.05, 0.8); // 每级增加5%（从8%降低）
        
        // 金币出现率递增
        this.coinChance = Math.min(this.baseCoinChance + level * 0.02, 0.95); // 每级增加2%（从3%降低）
        
        // 金币价值递增
        this.coinValue = Math.floor(this.baseCoinValue * (1 + level * 0.15)); // 每级增加15%（从20%降低）
        
        // console.log(`难度级别: ${level}, 速度: ${this.runSpeed.toFixed(3)}, 障碍率: ${this.obstacleChance.toFixed(2)}, 金币率: ${this.coinChance.toFixed(2)}`);
    }

    _updateBackgroundMusic() {
        const currentSpeedRatio = this.runSpeed / this.initialRunSpeed;
        
        // 实时调整音乐播放速度，让音乐与游戏节奏同步
        this.audioManager.selectMusicBySpeed(currentSpeedRatio);
    }

    // This method will be called on every frame
    update() {
        if (this.gameOver) {
            // Still update the animation mixer to allow end animations to play
            if (this.mixer) {
                this.mixer.update(this.clock.getDelta());
            }
            return;
        }

        const delta = this.clock.getDelta();
        // Update the animation mixer with dynamic speed
        if (this.mixer && this.runAction) {
            // 根据当前移动速度调整动画速度
            const speedRatio = this.runSpeed / this.initialRunSpeed;
            const animationSpeed = this.baseAnimationSpeed * speedRatio;
            this.runAction.setEffectiveTimeScale(animationSpeed);
            
            this.mixer.update(delta);
        }

        // Increase speed over time
        if (this.runSpeed < this.maxRunSpeed) {
            this.runSpeed += this.runSpeedIncrease;
        }

        // 动态调整路段长度
        this._calculateDynamicSegmentLength();

        // Animate coins
        this.activeCoins.forEach(coin => {
            coin.rotation.y += 0.05;
        });
        
        // Animate obstacles - 障碍物动画效果
        this.activeObstacles.forEach(obstacle => {
            if (obstacle.visible && obstacle.userData.glowMesh) {
                // 让发光效果呼吸闪烁
                const time = Date.now() * 0.003;
                const opacity = 0.2 + Math.sin(time + obstacle.position.x) * 0.15;
                obstacle.userData.glowMesh.material.opacity = Math.max(0.1, opacity);
                obstacle.userData.glowMesh.visible = true;
                
                // 轻微旋转动画
                obstacle.rotation.y += 0.01;
            }
        });

        // 玩家始终向前移动（负 Z 方向）
        this.player.position.z -= this.runSpeed;
        this.distanceTraveled += this.runSpeed; // 更新跑过距离

        // 平滑移动玩家到目标车道
        this.targetX = this.lanes[this.currentLane];
        this.player.position.x += (this.targetX - this.player.position.x) * this.moveLerpFactor;
        
        // 确保角色模型始终朝向前进方向
        this._updatePlayerModelDirection();
        
        // 更新难度
        this._updateDifficulty();
        
        // 根据速度更新背景音乐
        this._updateBackgroundMusic();


        // Handle jumping
        if (this.isJumping) {
            this.player.position.y += this.velocityY;
            this.velocityY += this.gravity;
            if (this.player.position.y <= 0.5) {
                this.player.position.y = 0.5;
                this.isJumping = false;
                this.velocityY = 0;
            }
        }

        // 相机跟随玩家，只跟随Z轴（向前）移动，不跟随X轴（左右）和Y轴（跳跃）移动
        const fixedCameraHeight = 5.5; // 固定的摄像机高度
        const cameraTargetPosition = new THREE.Vector3(0, fixedCameraHeight, this.player.position.z + 10);
        this.world.camera.position.lerp(cameraTargetPosition, 0.1);
        // 相机始终看向前方固定高度的一个点，不受玩家跳跃影响
        const fixedLookAtHeight = 1; // 固定的观看点高度
        const lookAtTarget = new THREE.Vector3(0, fixedLookAtHeight, this.player.position.z - 5);
        this.world.camera.lookAt(lookAtTarget);


        // Check and update ground segments and obstacles
        this._updateGround();

        // Update score display
        this.scoreElement.innerText = this.score;

        // Check for collisions
        this._checkCollisions();
    }

    // 动态计算路段长度，根据当前速度调整
    _calculateDynamicSegmentLength() {
        const speedRatio = this.runSpeed / this.initialRunSpeed;
        
        // 使用平滑的插值函数计算路段长度
        // 速度比1.0时用基础长度，速度比10.0时用最大长度
        const minSpeedRatio = 1.0;
        const maxSpeedRatio = 10.0;
        
        const normalizedSpeed = Math.min(Math.max(speedRatio, minSpeedRatio), maxSpeedRatio);
        const lengthRatio = (normalizedSpeed - minSpeedRatio) / (maxSpeedRatio - minSpeedRatio);
        
        // 使用平滑曲线（easeOut）让长度变化更自然
        const smoothRatio = 1 - Math.pow(1 - lengthRatio, 2);
        
        const newLength = this.baseGroundSegmentLength + 
                         (this.maxGroundSegmentLength - this.baseGroundSegmentLength) * smoothRatio;
        
        this.currentSegmentLength = Math.round(newLength);
        
        // 调试信息（可选）
        if (Math.abs(this.currentSegmentLength - (this.lastSegmentLength || 0)) >= 1) {
            console.log(`📏 路段长度调整: ${this.currentSegmentLength} (速度比: ${speedRatio.toFixed(2)}x)`);
            this.lastSegmentLength = this.currentSegmentLength;
        }
    }

    start() {
        // 游戏开始时间将在用户第一次交互时设置
        console.log('🎮 游戏循环启动，等待用户第一次交互开始计时...');
        
        // 直接启动游戏循环，音频将在用户交互后自动启动
        console.log('游戏启动，等待用户交互以启动音频...');
        
        // Pass the update function to the render loop
        this.world.render(this.update.bind(this));
    }
}

// Entry point
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // 启动游戏
    game.start();
    
    // 显示友好的音频提示
    console.log('🎮 Temple Run 已启动！');
    console.log('🎵 点击屏幕或按任意键开始音乐和音效');
});
