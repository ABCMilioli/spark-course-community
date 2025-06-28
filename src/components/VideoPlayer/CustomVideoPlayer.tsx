import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

interface CustomVideoPlayerProps {
  youtubeId?: string;
  videoUrl?: string;
  onProgress?: (percentage: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    Vimeo: any;
  }
}

// Função para detectar se é uma URL do Vimeo
const isVimeoUrl = (url: string): boolean => {
  return url.includes('vimeo.com/') || url.includes('player.vimeo.com/');
};

// Função para extrair o ID do Vimeo
const getVimeoId = (url: string): string | null => {
  if (url.includes('vimeo.com/')) {
    return url.split('vimeo.com/')[1]?.split('?')[0] || null;
  }
  if (url.includes('player.vimeo.com/video/')) {
    return url.split('player.vimeo.com/video/')[1]?.split('?')[0] || null;
  }
  return null;
};

export function CustomVideoPlayer({ 
  youtubeId, 
  videoUrl,
  onProgress, 
  onPrevious, 
  onNext,
  hasNext = false,
  hasPrevious = false 
}: CustomVideoPlayerProps) {
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playerType, setPlayerType] = useState<'youtube' | 'vimeo' | 'native' | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Custom controls para vídeo nativo
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determinar tipo de player
  useEffect(() => {
    if (youtubeId) {
      setPlayerType('youtube');
    } else if (videoUrl && isVimeoUrl(videoUrl)) {
      setPlayerType('vimeo');
    } else if (videoUrl) {
      setPlayerType('native');
    } else {
      setPlayerType(null);
    }
  }, [youtubeId, videoUrl]);

  useEffect(() => {
    if (playerType === 'youtube') {
      // Load YouTube API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          initializeYouTubePlayer();
        };
      } else {
        initializeYouTubePlayer();
      }
    } else if (playerType === 'vimeo') {
      // Load Vimeo API
      if (!window.Vimeo) {
        const tag = document.createElement('script');
        tag.src = 'https://player.vimeo.com/api/player.js';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        tag.onload = () => {
          initializeVimeoPlayer();
        };
      } else {
        initializeVimeoPlayer();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playerType, youtubeId, videoUrl]);

  const initializeYouTubePlayer = () => {
    if (playerRef.current && window.YT && youtubeId) {
      const newPlayer = new window.YT.Player(playerRef.current, {
        height: '400',
        width: '100%',
        videoId: youtubeId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          cc_load_policy: 0,
          iv_load_policy: 3,
          autohide: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            setDuration(event.target.getDuration());
            setIsReady(true);
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startProgressTracking();
            } else {
              setIsPlaying(false);
              stopProgressTracking();
            }
          }
        }
      });
    }
  };

  const initializeVimeoPlayer = () => {
    if (playerRef.current && window.Vimeo && videoUrl) {
      const vimeoId = getVimeoId(videoUrl);
      if (!vimeoId) return;

      const iframe = document.createElement('iframe');
      iframe.src = `https://player.vimeo.com/video/${vimeoId}?h=400&w=100%&controls=0&autopause=0&muted=0`;
      iframe.width = '100%';
      iframe.height = '400';
      iframe.frameBorder = '0';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      
      // Limpar o container
      if (playerRef.current) {
        playerRef.current.innerHTML = '';
        playerRef.current.appendChild(iframe);
      }

      const newPlayer = new window.Vimeo.Player(iframe);
      
      newPlayer.ready().then(() => {
        setPlayer(newPlayer);
        setIsReady(true);
        
        // Obter duração
        newPlayer.getDuration().then((dur: number) => {
          setDuration(dur);
        });
        
        // Configurar volume
        newPlayer.setVolume(volume / 100);
      });

      // Event listeners do Vimeo
      newPlayer.on('play', () => {
        setIsPlaying(true);
        startProgressTracking();
      });

      newPlayer.on('pause', () => {
        setIsPlaying(false);
        stopProgressTracking();
      });

      newPlayer.on('timeupdate', (data: { percent: number, seconds: number }) => {
        setCurrentTime(data.seconds);
        if (onProgress && duration > 0) {
          onProgress(data.percent * 100);
        }
      });
    }
  };

  const startProgressTracking = () => {
    if (playerType === 'youtube') {
      intervalRef.current = setInterval(() => {
        if (player) {
          const current = player.getCurrentTime();
          setCurrentTime(current);
          
          if (duration > 0) {
            const percentage = (current / duration) * 100;
            onProgress?.(percentage);
          }
        }
      }, 1000);
    }
    // Para Vimeo, o tracking é feito via event listeners
  };

  const stopProgressTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const togglePlay = () => {
    if (!player) return;
    
    if (playerType === 'youtube') {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } else if (playerType === 'vimeo') {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (!player || duration <= 0) return;
    
    const newTime = (value[0] / 100) * duration;
    setCurrentTime(newTime);
    
    if (playerType === 'youtube') {
      player.seekTo(newTime);
    } else if (playerType === 'vimeo') {
      player.setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (!player) return;
    
    if (playerType === 'youtube') {
      player.setVolume(newVolume);
      setIsMuted(newVolume === 0);
    } else if (playerType === 'vimeo') {
      player.setVolume(newVolume / 100);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (!player) return;
    
    if (playerType === 'youtube') {
      if (isMuted) {
        player.setVolume(volume);
        setIsMuted(false);
      } else {
        player.setVolume(0);
        setIsMuted(true);
      }
    } else if (playerType === 'vimeo') {
      if (isMuted) {
        player.setVolume(volume / 100);
        setIsMuted(false);
      } else {
        player.setVolume(0);
        setIsMuted(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (onProgress && duration > 0) {
      onProgress((video.currentTime / duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setCurrentTime(video.currentTime);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isFullscreen) {
      if (video.requestFullscreen) video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleRateChange = () => {
    const video = videoRef.current;
    if (!video) return;
    const rates = [1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const nextRate = rates[(idx + 1) % rates.length];
    setPlaybackRate(nextRate);
    video.playbackRate = nextRate;
  };

  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
    setCurrentTime(video.currentTime);
  };

  if (videoUrl && playerType === 'native') {
    // Renderiza vídeo nativo com controles customizados
    return (
      <Card className="overflow-hidden bg-black">
        <div className="relative group" onMouseMove={() => setShowControls(true)}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-[400px] bg-black"
            style={{ objectFit: 'contain' }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={() => setIsMuted(videoRef.current?.volume === 0)}
            controls={false}
            controlsList="nodownload"
            preload="auto"
            onContextMenu={e => e.preventDefault()}
          />
          {/* Controles customizados */}
          {showControls && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity flex flex-col gap-2">
              {/* Barra de progresso */}
              <Slider
                value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleSkip(-10)}><SkipBack className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" onClick={handlePlayPause}>
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleSkip(10)}><SkipForward className="w-5 h-5" /></Button>
                  <span className="text-xs text-white ml-2">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleMute}>
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <Slider
                    value={[volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                  <Button variant="ghost" size="icon" onClick={handleRateChange} title="Velocidade">
                    <span className="text-xs text-white">{playbackRate}x</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleFullscreen}><Maximize className="w-5 h-5" /></Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-black">
      <div className="relative">
        {/* YouTube ou Vimeo Player */}
        <div ref={playerRef} className="w-full" />
        
        {/* Custom Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              value={[progressPercentage]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                disabled={!isReady}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>

              {/* Next Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!hasNext}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
