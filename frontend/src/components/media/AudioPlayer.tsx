import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Audio đang phát trên trang: phát cái mới thì dừng cái cũ (ví dụ audio nhóm và audio câu cùng màn) */
let playing: HTMLAudioElement | null = null;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface AudioPlayerProps {
  src: string;
  className?: string;
}

/**
 * Trình phát tự làm thay cho `<audio controls>` của trình duyệt: giao diện có sẵn của trình duyệt
 * có menu "Tải xuống" và chuột phải "Lưu âm thanh thành…", làm lộ tệp đề thi (bản quyền của hệ
 * thống). Thẻ <audio> ở đây không có controls, chỉ điều khiển qua các nút bên dưới; chặn luôn
 * menu chuột phải trên trình phát. Chỉ có Phát/Tạm dừng, tua, bật/tắt tiếng như máy nghe đề thi.
 */
export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [paused, setPaused] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  // Rời trang/đổi câu khi đang phát: dừng hẳn để không còn tiếng chạy ngầm
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (playing === audio) playing = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const onPlay = (event: SyntheticEvent<HTMLAudioElement>) => {
    if (playing && playing !== event.currentTarget) playing.pause();
    playing = event.currentTarget;
    setPaused(false);
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) audio.muted = !audio.muted;
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      role="group"
      aria-label="Trình phát âm thanh"
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'flex h-13.5 w-full items-center gap-3 rounded-full bg-slate-100 px-2 select-none',
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={onPlay}
        onPause={() => setPaused(true)}
        onEnded={() => setPaused(true)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? 'Phát' : 'Tạm dừng'}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-colors outline-none hover:bg-brand focus-visible:ring-3 focus-visible:ring-primary/30"
      >
        {paused ? (
          <Play className="ml-0.5 size-4 fill-current" />
        ) : (
          <Pause className="size-4 fill-current" />
        )}
      </button>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration || 0)}
        disabled={!duration}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Vị trí phát"
        aria-valuetext={`${formatTime(current)} trên ${formatTime(duration)}`}
        style={{
          // Phần đã phát tô màu chính, phần còn lại xám (slate-300)
          background: `linear-gradient(to right, var(--primary) ${progress}%, #cbd5e1 ${progress}%)`,
        }}
        className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-primary outline-none focus-visible:ring-3 focus-visible:ring-primary/30 disabled:cursor-default [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />

      <span className="shrink-0 text-xs text-slate-600 tabular-nums">
        {formatTime(current)} / {formatTime(duration)}
      </span>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
        className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-primary/30"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}
